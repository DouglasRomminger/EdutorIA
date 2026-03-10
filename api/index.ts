import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
  }
}

const db = getFirestore();

const app = express();

// In-memory storage only for agents (persisted via Vercel env vars)
const storage = {
  agents: {
    ebook: process.env.TESS_AGENT_EBOOK || "",
    lesson_plan: process.env.TESS_AGENT_PLANO || "",
    slides: process.env.TESS_AGENT_SLIDES || "",
    images: process.env.TESS_AGENT_IMAGENS || "",
  },
};

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function decodeToken(token: string) {
  if (admin.apps.length) {
    return await admin.auth().verifyIdToken(token);
  }
  // Dev fallback (no firebase-admin configured)
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
  return { uid: payload.user_id || payload.sub, email: payload.email, name: payload.name, picture: payload.picture };
}

async function buildUser(uid: string, profile?: { email: string; displayName: string | null; photoURL: string | null }) {
  const adminEmail = process.env.ADMIN_EMAIL || "";
  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();

  if (!snap.exists) {
    const isAdmin = adminEmail && (profile?.email || "").trim().toLowerCase() === adminEmail.trim().toLowerCase();
    const data = {
      email: profile?.email || "",
      displayName: profile?.displayName || null,
      photoURL: profile?.photoURL || null,
      credits: 10,
      role: isAdmin ? "admin" : "user",
      blocked: false,
    };
    await ref.set(data);
    return { uid, ...data };
  }

  const data = snap.data()!;

  // Update profile fields if provided
  if (profile) {
    const updates: Record<string, any> = {};
    if (profile.email && profile.email !== data.email) updates.email = profile.email;
    if (profile.displayName !== undefined && profile.displayName !== data.displayName) updates.displayName = profile.displayName;
    if (profile.photoURL !== undefined && profile.photoURL !== data.photoURL) updates.photoURL = profile.photoURL;

    // Promote to admin if email matches
    const isAdmin = adminEmail && (profile.email || "").trim().toLowerCase() === adminEmail.trim().toLowerCase();
    if (isAdmin && data.role !== "admin") updates.role = "admin";

    if (Object.keys(updates).length > 0) {
      await ref.update(updates);
      Object.assign(data, updates);
    }
  }

  return {
    uid,
    email: data.email || "",
    displayName: data.displayName || null,
    photoURL: data.photoURL || null,
    credits: data.credits ?? 10,
    role: data.role || "user",
    blocked: data.blocked ?? false,
  };
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────

const requireAuth = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const decoded = await decodeToken(authHeader.slice(7));
    req.user = await buildUser(decoded.uid, {
      email: decoded.email || "",
      displayName: decoded.name || null,
      photoURL: decoded.picture || null,
    });
    if (req.user.blocked) return res.status(403).json({ error: "Conta bloqueada." });
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido." });
  }
};

const requireAdmin = async (req: any, res: any, next: any) => {
  await requireAuth(req, res, () => {
    if (req.user?.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    next();
  });
};

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.post("/api/auth/login", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "Missing idToken" });
    const decoded = await decodeToken(idToken);
    const user = await buildUser(decoded.uid, {
      email: decoded.email || "",
      displayName: decoded.name || null,
      photoURL: decoded.picture || null,
    });
    if (user.blocked) return res.status(403).json({ error: "Conta bloqueada. Entre em contato com o suporte." });
    res.json(user);
  } catch (error: any) {
    res.status(401).json({ error: "Token inválido: " + error.message });
  }
});

app.get("/api/auth/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.json(null);
  try {
    const decoded = await decodeToken(authHeader.slice(7));
    res.json(await buildUser(decoded.uid, {
      email: decoded.email || "",
      displayName: decoded.name || null,
      photoURL: decoded.picture || null,
    }));
  } catch {
    res.json(null);
  }
});

app.post("/api/auth/logout", (_req, res) => res.json({ success: true }));

// ─── Projects ─────────────────────────────────────────────────────────────────

app.get("/api/projects", requireAuth, async (req: any, res) => {
  const snap = await db.collection("projects").where("userId", "==", req.user.uid).orderBy("createdAt", "desc").get();
  res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
});

app.get("/api/projects/:id", requireAuth, async (req: any, res) => {
  const doc = await db.collection("projects").doc(req.params.id).get();
  if (!doc.exists || doc.data()?.userId !== req.user.uid) return res.status(404).json({ error: "Not found" });
  res.json({ id: doc.id, ...doc.data() });
});

app.post("/api/projects", requireAuth, async (req: any, res) => {
  const { type, title, briefing } = req.body;
  const now = new Date().toISOString();
  const project = {
    userId: req.user.uid,
    title: title || briefing?.main_topic || "Novo Projeto",
    type,
    status: "draft",
    content: "",
    briefing: briefing || null,
    outline: { chapters: [] },
    createdAt: now,
    updatedAt: now,
  };
  const ref = await db.collection("projects").add(project);
  res.json({ id: ref.id, ...project });
});

app.put("/api/projects/:id", requireAuth, async (req: any, res) => {
  const docRef = db.collection("projects").doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data()?.userId !== req.user.uid) return res.status(404).json({ error: "Not found" });

  const { title, status, content, outline } = req.body;
  const now = new Date().toISOString();
  const updates: any = { updatedAt: now };
  if (title !== undefined) updates.title = title;
  if (status !== undefined) updates.status = status;
  if (content !== undefined) updates.content = content;
  if (outline !== undefined) updates.outline = outline;

  await docRef.update(updates);
  res.json({ id: req.params.id, ...doc.data(), ...updates });
});

app.delete("/api/projects/:id", requireAuth, async (req: any, res) => {
  const docRef = db.collection("projects").doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data()?.userId !== req.user.uid) return res.status(404).json({ error: "Not found" });
  await docRef.delete();
  res.json({ success: true });
});

// ─── Generate (Tess IA) ───────────────────────────────────────────────────────

app.post("/api/generate", requireAuth, async (req: any, res) => {
  const { type, briefing } = req.body;
  const user = req.user;

  if (!type || !briefing) return res.status(400).json({ error: "Missing type or briefing" });

  if (user.credits <= 0) return res.status(402).json({ error: "Créditos insuficientes." });

  const agentId = storage.agents[type as keyof typeof storage.agents];
  if (!agentId) return res.status(400).json({ error: `Agente Tess não configurado para: ${type}. Configure na área ADM.` });

  const TESS_API_KEY = process.env.TESS_API_KEY;
  if (!TESS_API_KEY) return res.status(500).json({ error: "TESS_API_KEY não configurada." });

  const prompts: Record<string, string> = {
    ebook: `Gere um sumário estruturado para um e-book sobre "${briefing.main_topic}".
Público-alvo: ${briefing.target_audience}. Tom: ${briefing.tone}. Tamanho: ${briefing.length}.
Retorne APENAS um JSON válido no formato:
{"chapters":[{"title":"...","sections":["...","..."],"status":"pending"}]}`,

    lesson_plan: `Gere um plano de aula estruturado sobre "${briefing.main_topic}".
Público-alvo: ${briefing.target_audience}. Objetivo: ${briefing.objective}. Tom: ${briefing.tone}.
Retorne APENAS um JSON válido no formato:
{"chapters":[{"title":"...","sections":["...","..."],"status":"pending"}]}`,

    slides: `Gere um roteiro de slides para uma apresentação sobre "${briefing.main_topic}".
Público-alvo: ${briefing.target_audience}. Tom: ${briefing.tone}. Tamanho: ${briefing.length}.
Retorne APENAS um JSON válido no formato:
{"chapters":[{"title":"Slide X: ...","sections":["Ponto 1","Ponto 2"],"status":"pending"}]}`,

    images: `Gere prompts descritivos para criação de imagens educacionais sobre "${briefing.main_topic}".
Público-alvo: ${briefing.target_audience}. Estilo: ${briefing.tone}.
Retorne APENAS um JSON válido no formato:
{"chapters":[{"title":"Imagem: ...","sections":["Prompt detalhado para geração"],"status":"pending"}]}`,
  };

  const prompt = prompts[type] || prompts.ebook;

  try {
    const tessRes = await fetch(`https://api.tess.im/agents/${agentId}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TESS_API_KEY}` },
      body: JSON.stringify({ wait_execution: true, model: "tess-5", messages: [{ role: "user", content: prompt }] }),
    });

    if (!tessRes.ok) {
      const errText = await tessRes.text();
      console.error("Tess API error:", errText);
      return res.status(502).json({ error: "Erro na API Tess IA: " + tessRes.statusText });
    }

    const tessData = await tessRes.json();
    const rawText: string =
      tessData?.output || tessData?.response || tessData?.choices?.[0]?.message?.content || tessData?.content || "";

    if (!rawText) return res.status(502).json({ error: "Resposta vazia da Tess IA." });

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(502).json({ error: "Resposta da Tess IA não contém JSON válido." });

    const outline = JSON.parse(jsonMatch[0]);

    // Debit credit and add log in parallel
    await Promise.all([
      db.collection("users").doc(user.uid).update({ credits: FieldValue.increment(-1) }),
      db.collection("logs").add({
        userId: user.uid,
        userEmail: user.email || "",
        action: `Gerou ${type}`,
        contentType: type,
        createdAt: new Date().toISOString(),
      }),
    ]);

    res.json({ outline });
  } catch (error: any) {
    console.error("Generate error:", error);
    res.status(500).json({ error: "Erro interno na geração: " + error.message });
  }
});

// ─── Admin ────────────────────────────────────────────────────────────────────

app.get("/api/admin/users", requireAdmin, async (_req, res) => {
  const snap = await db.collection("users").get();
  const users = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  res.json(users);
});

app.patch("/api/admin/users/:uid", requireAdmin, async (req, res) => {
  const { uid } = req.params;
  const { role, credits, blocked } = req.body;
  const updates: Record<string, any> = {};
  if (role !== undefined) updates.role = role;
  if (credits !== undefined) updates.credits = Number(credits);
  if (blocked !== undefined) updates.blocked = blocked;

  const ref = db.collection("users").doc(uid);
  await ref.set(updates, { merge: true });
  const snap = await ref.get();
  res.json({ uid, ...snap.data() });
});

app.get("/api/admin/logs", requireAdmin, async (_req, res) => {
  const snap = await db.collection("logs").orderBy("createdAt", "desc").limit(500).get();
  res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
});

app.get("/api/admin/agents", requireAdmin, (_req, res) => {
  res.json({
    ...storage.agents,
    _envStatus: {
      ebook: !!process.env.TESS_AGENT_EBOOK,
      lesson_plan: !!process.env.TESS_AGENT_PLANO,
      slides: !!process.env.TESS_AGENT_SLIDES,
      images: !!process.env.TESS_AGENT_IMAGENS,
    },
    _vercelConfigured: !!(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID),
  });
});

app.put("/api/admin/agents", requireAdmin, async (req, res) => {
  const { ebook, lesson_plan, slides, images } = req.body;
  if (ebook !== undefined) storage.agents.ebook = ebook;
  if (lesson_plan !== undefined) storage.agents.lesson_plan = lesson_plan;
  if (slides !== undefined) storage.agents.slides = slides;
  if (images !== undefined) storage.agents.images = images;

  let vercelPersisted = false;
  let vercelError: string | null = null;

  const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
  const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;

  if (VERCEL_TOKEN && VERCEL_PROJECT_ID) {
    try {
      const envMap: Record<string, string> = {};
      if (ebook !== undefined) envMap["TESS_AGENT_EBOOK"] = ebook;
      if (lesson_plan !== undefined) envMap["TESS_AGENT_PLANO"] = lesson_plan;
      if (slides !== undefined) envMap["TESS_AGENT_SLIDES"] = slides;
      if (images !== undefined) envMap["TESS_AGENT_IMAGENS"] = images;

      const listRes = await fetch(`https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env`, {
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      });

      if (listRes.ok) {
        const listData = await listRes.json();
        const existingIds: Record<string, string> = {};
        for (const env of (listData.envs || [])) {
          existingIds[env.key] = env.id;
        }

        for (const [key, value] of Object.entries(envMap)) {
          const existingId = existingIds[key];
          if (existingId) {
            await fetch(`https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env/${existingId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${VERCEL_TOKEN}` },
              body: JSON.stringify({ value, type: "plain", target: ["production", "preview", "development"] }),
            });
          } else {
            await fetch(`https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${VERCEL_TOKEN}` },
              body: JSON.stringify({ key, value, type: "plain", target: ["production", "preview", "development"] }),
            });
          }
        }
        vercelPersisted = true;
      } else {
        vercelError = `Vercel API: ${listRes.statusText}`;
      }
    } catch (e: any) {
      vercelError = e.message;
    }
  }

  res.json({ ...storage.agents, vercelPersisted, vercelError, vercelConfigured: !!(VERCEL_TOKEN && VERCEL_PROJECT_ID) });
});

export default app;
