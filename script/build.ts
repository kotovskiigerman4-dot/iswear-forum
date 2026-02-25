import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// Оставляем только то, что реально нужно серверу для работы
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  // Вите сам разберется с иконками через tree-shaking
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];

  // Создаем список внешних зависимостей
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  // ДОПОЛНИТЕЛЬНО: Явно блокируем фронтенд-библиотеки для сервера
  // Чтобы esbuild даже не пытался их анализировать
  const frontendOnly = ["lucide-react", "react-icons", "react", "react-dom", "framer-motion"];
  const finalExternals = Array.from(new Set([...externals, ...frontendOnly]));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    // Используем расширенный список исключений
    external: finalExternals,
    logLevel: "info",
    // Запрещаем esbuild лезть глубоко в дерево зависимостей при поиске externals
    treeShaking: true,
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
