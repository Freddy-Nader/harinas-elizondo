<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="img/logo-white.png">
    <img src="img/logo-dark.png" width="240" alt="Harinas Elizondo logo">
  </picture>

  # Harinas Elizondo
  *Quality certificates for wheat flour, from the production lot to the client's inbox. Built with [Next.js](https://nextjs.org/).*

  > [!NOTE]
  > <b>Unofficial school project.</b> Made for a university course and not affiliated with, endorsed by or used by Harinas Elizondo. The logo is shown only to identify the case study.

  [![CI](https://github.com/ValleryR/harinas-elizondo/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/ValleryR/harinas-elizondo/actions/workflows/ci.yml)

  [Versión en español](README-es.md) • [What it is](#what-it-is) • [Features](#features) • [Getting Started](#getting-started) • [Docs](docs/README.md) • [For LLMs](docs/llm/README.md)
</div>

## What it is

Harinas Elizondo have to prove that every delivery meets the client's quality specs. In this case the lab tests each production lot with two machines, an alveograph and a farinograph, and today it builds the quality certificate by hand with spreadsheets and a PDF editor. That is slow, and it makes it too easy to "adjust" old results so they fit a client.

This app replaces that process. The lab registers lots and their inspections, the app compares the results with each client's reference limits (or the international ones), and it issues a PDF certificate that shows any deviation. The certificate is emailed to the client and to the warehouse, and every action is logged.

It is the team project for *Desarrollo de Software* at Universidad Anáhuac (fall 2026), based on a case study written by the course professor. The final delivery was on November 13, 2026, and the app runs at https://harinas-elizondo.vercel.app. The design documents (architecture, database, technical spec, development process and test guides) are listed in [docs/README.md](docs/README.md).

## Features

- **Clients.** Registered with their SAP key, contact and their own reference limits. Clients are deactivated, never deleted.
- **Lab equipment.** Alveographs and farinographs with a generated key, the five parameters each one measures and their limits. Equipment without limits can't be used.
- **Lots and inspections.** Results captured per lot, with the inspection sequence (A, B, … Z, AA) assigned by the app.
- **Certificates.** Issued from the lot's latest complete inspection, with results from both machines, deviations, order and invoice data, then sent by email with proof of delivery.
- **Reports.** Certificate history with filters, charts by period and an Excel export for Power BI, plus production quality statistics (lots in spec, a control chart per factor, mean, spread and process capability).
- **Users.** An administrator creates accounts and sets their role.
- **Roles and audit log.** Lab staff can do everything, managers can only consult, and every change records who made it.
- **In Spanish.** Everything the user sees is in Spanish.

## Getting Started

### Prerequisites

You need [Node.js](https://nodejs.org/) 22 or newer and [pnpm](https://pnpm.io/), which Node can set up for you with `corepack enable`.

### Setup

```bash
# Clone the repository
git clone https://github.com/ValleryR/harinas-elizondo.git
cd harinas-elizondo

# Install dependencies and create your local settings file
pnpm install
cp .env.example .env.local

# Start the app
pnpm dev
```

Then open http://localhost:3000.

> [!NOTE]
> The screens work right away, but signing in and saving data need a Postgres database. The steps to connect one are in the [runbook](docs/llm/runbook.md).
