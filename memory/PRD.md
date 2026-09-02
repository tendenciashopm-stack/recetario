# Salud Nutrition — PRD

## Problem Statement (original)
App de recetas saludables con cobro mensual (S/15). Recetas para diabéticos, bajar de peso, comida saludable y veganos. Administrador (dueño) puede crear cuentas, crear recetas manualmente y subir PDFs para extraer recetas automáticamente. Buscador de recetas. Cada receta con nombre del plato, ingredientes, modo de preparación (pasos), emplatado/servido, tiempo de preparación, tiempo de cocción y utensilios. Página segura, actualizable, buena paleta de colores, en español.

## User choices
- Pagos: Yape, Plin, BCP, BBVA (Perú) — flujo manual: cliente sube comprobante, admin aprueba. S/15 mensual renovable.
- Auth: Email + contraseña (JWT).
- PDFs: extracción automática con IA (Gemini).
- Idioma: solo español.

## Architecture
- Frontend: React 19 + Tailwind + shadcn/ui, react-router. Palette green #2E5A44 / terracotta #D96B43 / cream #FDFBF7. Fonts Playfair Display + Outfit.
- Backend: FastAPI + MongoDB (motor). JWT Bearer auth (localStorage). All routes under /api.
- Storage: Emergent Object Storage (recipe images, PDFs, payment proofs).
- LLM: emergentintegrations + EMERGENT_LLM_KEY, Gemini gemini-2.5-flash for PDF recipe extraction.

## Personas
- Admin (dueño): gestiona catálogo, usuarios, pagos y datos de pago.
- Cliente: se registra, paga S/15, sube comprobante, y accede a recetas completas.

## Implemented (2026-09-02)
- Auth JWT (register/login/me), admin seeding (admin@saludnutrition.com / Admin2026!). (register/login/me), admin seeding (admin@saludnutrition.com / Admin2026!).
- Catálogo público con buscador (nombre/descripción/ingredientes) y filtros por 4 categorías.
- Detalle de receta con bloqueo (locked) para no suscriptores; completo para suscriptores/admin.
- 8 recetas de ejemplo pre-cargadas (2 por categoría) con estructura completa.
- Flujo de suscripción: datos de pago (Yape/Plin/BCP/BBVA), subida de comprobante, estado pendiente/activo/vencido.
- Panel admin: Resumen (stats), Recetas (CRUD manual + extractor PDF con IA), Usuarios (crear/activar/revocar/eliminar), Pagos (aprobar/rechazar), Ajustes de pago.
- Object storage para imágenes, PDFs y comprobantes.
- Testing: 23 pruebas backend + flujos Playwright, 100% pass.

## Update (2026-09-02) — Contenido del PDF + Paso a Paso con fotos
- Importadas 30 recetas del PDF "25 Recetas de Brunch Saludables" vía extractor IA (Gemini), con estructura completa.
- Fotos de portada reales extraídas del PDF y asignadas a cada receta.
- Campo `pasos_imagenes` en modelo Recipe; RecipeDetail muestra cada paso con su foto.
- 29 recetas del PDF con fotos de paso reales extraídas del PDF; Bruschettas (sin grid en PDF) + 8 recetas de ejemplo completadas con fotos de paso generadas por IA (estilo consistente).
- Resultado: las 38 recetas tienen fotos de paso a paso completas.
- Scripts en /app/scripts: import_pdf, attach_images, attach_steps, bruschetta_steps, attach_seed_steps.

## Update (2026-09-02) — Almuerzos + precio único + admin
- Integradas 50 recetas del PDF "Almuerzos Saludables" (extracción por bloques para evitar truncado), cada una con su foto real del PDF (4 portadas generadas con IA). Sin fotos de paso por defecto (se pueden generar con el botón IA por receta para controlar costo). Total catálogo: 96 recetas.
- Precio S/15 ahora aparece SOLO en la página de Suscripción (removido de landing, footer, register, panel bloqueado y "cómo funciona").
- Endpoint create /admin/recipes admite ?auto_generate=false para importaciones masivas sin generar imágenes.
- Admin: admin@saludnutrition.com / Admin2026! (crear cuentas desde Admin → Usuarios, rol admin o cliente).

## Backlog / Next
- P1: Generación automática de imagen para recetas importadas por PDF (nano banana).
- P1: Vista previa/edición del draft de PDF antes de guardar.
- P2: Recordatorio de renovación mensual y notificaciones por correo (Resend).
- P2: Favoritos y listas de compras para clientes.
- P2: Refactor server.py en módulos (auth/recipes/admin).
