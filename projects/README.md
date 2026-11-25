# Video Projects Archive

This folder stores completed and in-progress video projects for the iDevak YouTube channel.

## Directory Structure

Each subfolder contains the `video.json` project file and any project-specific notes or references:

```text
projects/
├── emudhra-key-was-four/      # Complete 90-scene deep dive on eMudhra key compromise
│   └── video.json
└── README.md
```

## How to Load an Archived Project Safely (Isolated Workspace)

Do not overwrite `content/video.json` at the repo root. Clone an archived project into a gitignored workspace under `workspaces/<slug>/`:

```bash
# Create an isolated workspace from an archived project and set it active:
npm run project:new -- emudhra-test --from emudhra-key-was-four --use

# Test and preview immediately inside workspaces/emudhra-test/:
npm run draft
npm run preview
```
