import express from "express";
import cors from "cors";
import session from "express-session";
import admin from "firebase-admin";

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

const app = express();

// In-memory storage
const storage = {
  users: [] as any[],
  projects: [] as any[],
  logs: [] as any[],
  agents: {
    ebook: process.env.TESS_AGENT_EBOOK || "",
    lesson_plan: process.env.TESS_AGENT_PLANO || "",
    slides: process.env.TESS_AGENT_SLIDES || "",
    images: process.env.TESS_AGENT_IMAGENS || "",
  },
};

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "edutoria-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  })
);

const requireAuth = (req: any, res: any, next: any) => {
  if (!(req.session as any).user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

const requireAdmin = (req: any, res: any, next: any) => {
  const user = (req.session as any).user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  next();
};

function addLog(userId: string, userEmail: string, action: string, contentType: string) {
  storage.logs.unshift({
    id: Math.random().toString(36).substring(7),
    userId,
    userEmail,
    action,
    contentType,
    createdAt: new Date().toISOString(),
  });
  // Keep last 500 logs
  if (storage.logs.length > 500) storage.logs = storage.logs.slice(0, 500);
}

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.post("/api/auth/login", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "Missing idToken" });

    let firebaseUid: string;
    let email: string | null = null;
    let displayName: string | null = null;
    let photoURL: string | null = null;

    // Verify with Firebase Admin if available
    if (admin.apps.length) {
      const decoded = await admin.auth().verifyIdToken(idToken);
      firebaseUid = decoded.uid;
      email = decoded.email || null;
      displayName = decoded.name || null;
      photoURL = decoded.picture || null;
    } else {
      // Dev fallback: decode token payload without verification
      const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString());
      firebaseUid = payload.user_id || payload.sub;
      email = payload.email || null;
      displayName = payload.name || null;
      photoURL = payload.picture || null;
    }

    let user = storage.users.find((u) => u.uid === firebaseUid);
    if (!user) {
      user = { uid: firebaseUid, email, displayName, photoURL, role: "user", credits: 10, blocked: false };
      storage.users.push(user);
    } else {
      user.email = email;
      user.displayName = displayName;
      user.photoURL = photoURL;
    }

    if (user.blocked) {
      return res.status(403).json({ error: "Conta bloqueada. Entre em contato com o suporte." });
    }

    (req.session as any).user = user;
    res.json(user);
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(401).json({ error: "Token inválido: " + error.message });
  }
});

app.get("/api/auth/me", (req, res) => {
  res.json((req.session as any).user || null);
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// ─── Projects ─────────────────────────────────────────────────────────────────

app.get("/api/projects", requireAuth, (req, res) => {
  const projects = storage.projects.filter((p) => p.userId === (req.session as any).user.uid);
  res.json(projects);
});

app.get("/api/projects/:id", requireAuth, (req, res) => {
  const project = storage.projects.find(
    (p) => p.id === req.params.id && p.userId === (req.session as any).user.uid
  );
  if (!project) return res.status(404).json({ error: "Not found" });
  res.json(project);
});

app.post("/api/projects", requireAuth, (req, res) => {
  const { type, title, briefing } = req.body;
  const id = Math.random().toString(36).substring(7);
  const now = new Date().toISOString();
  const project = {
    id,
    userId: (req.session as any).user.uid,
    title: title || briefing?.main_topic || "Novo Projeto",
    type,
    status: "draft",
    content: "",
    briefing,
    outline: { chapters: [] },
    createdAt: now,
    updatedAt: now,
  };
  storage.projects.unshift(project);
  res.json(project);
});

app.put("/api/projects/:id", requireAuth, (req, res) => {
  const idx = storage.projects.findIndex(
    (p) => p.id === req.params.id && p.userId === (req.session as any).user.uid
  );
  if (idx === -1) return res.status(404).json({ error: "Not found" });

  const { title, status, content, outline } = req.body;
  const now = new Date().toISOString();
  const updates: any = { updatedAt: now };
  if (title !== undefined) updates.title = title;
  if (status !== undefined) updates.status = status;
  if (content !== undefined) updates.content = content;
  if (outline !== undefined) updates.outline = outline;
  storage.projects[idx] = { ...storage.projects[idx], ...updates };
  res.json(storage.projects[idx]);
});

app.delete("/api/projects/:id", requireAuth, (req, res) => {
  storage.projects = storage.projects.filter(
    (p) => !(p.id === req.params.id && p.userId === (req.session as any).user.uid)
  );
  res.json({ success: true });
});

// ─── Generate (Tess IA) ───────────────────────────────────────────────────────

app.post("/api/generate", requireAuth, async (req, res) => {
  const { type, briefing } = req.body;
  const user = (req.session as any).user;

  if (!type || !briefing) {
    return res.status(400).json({ error: "Missing type or briefing" });
  }

  if (user.credits <= 0) {
    return res.status(402).json({ error: "Créditos insuficientes." });
  }

  const agentId = storage.agents[type as keyof typeof storage.agents];
  if (!agentId) {
    return res.status(400).json({ error: `Agente Tess não configurado para o tipo: ${type}. Configure na área ADM.` });
  }

  const TESS_API_KEY = process.env.TESS_API_KEY;
  if (!TESS_API_KEY) {
    return res.status(500).json({ error: "TESS_API_KEY não configurada." });
  }

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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TESS_API_KEY}`,
      },
      body: JSON.stringify({
        wait_execution: true,
        model: "tess-5",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!tessRes.ok) {
      const errText = await tessRes.text();
      console.error("Tess API error:", errText);
      return res.status(502).json({ error: "Erro na API Tess IA: " + tessRes.statusText });
    }

    const tessData = await tessRes.json();

    // Extract text from Tess response
    const rawText: string =
      tessData?.output ||
      tessData?.response ||
      tessData?.choices?.[0]?.message?.content ||
      tessData?.content ||
      "";

    if (!rawText) {
      return res.status(502).json({ error: "Resposta vazia da Tess IA." });
    }

    // Parse JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(502).json({ error: "Resposta da Tess IA não contém JSON válido." });
    }

    const outline = JSON.parse(jsonMatch[0]);

    // Debit credit from user
    const userIdx = storage.users.findIndex((u) => u.uid === user.uid);
    if (userIdx !== -1) {
      storage.users[userIdx].credits = Math.max(0, storage.users[userIdx].credits - 1);
      (req.session as any).user = storage.users[userIdx];
    }

    addLog(user.uid, user.email || "", `Gerou ${type}`, type);

    res.json({ outline });
  } catch (error: any) {
    console.error("Generate error:", error);
    res.status(500).json({ error: "Erro interno na geração: " + error.message });
  }
});

// ─── Admin ────────────────────────────────────────────────────────────────────

app.get("/api/admin/users", requireAdmin, (_req, res) => {
  res.json(storage.users);
});

app.patch("/api/admin/users/:uid", requireAdmin, (req, res) => {
  const idx = storage.users.findIndex((u) => u.uid === req.params.uid);
  if (idx === -1) return res.status(404).json({ error: "User not found" });

  const { role, credits, blocked } = req.body;
  if (role !== undefined) storage.users[idx].role = role;
  if (credits !== undefined) storage.users[idx].credits = Number(credits);
  if (blocked !== undefined) storage.users[idx].blocked = blocked;

  res.json(storage.users[idx]);
});

app.get("/api/admin/logs", requireAdmin, (_req, res) => {
  res.json(storage.logs);
});

app.get("/api/admin/agents", requireAdmin, (_req, res) => {
  res.json(storage.agents);
});

app.put("/api/admin/agents", requireAdmin, (req, res) => {
  const { ebook, lesson_plan, slides, images } = req.body;
  if (ebook !== undefined) storage.agents.ebook = ebook;
  if (lesson_plan !== undefined) storage.agents.lesson_plan = lesson_plan;
  if (slides !== undefined) storage.agents.slides = slides;
  if (images !== undefined) storage.agents.images = images;
  res.json(storage.agents);
});

export default app;
