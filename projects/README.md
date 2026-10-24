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

## How to Switch Projects

To work on an existing project or restore it into the engine:

```bash
# On Windows PowerShell:
Copy-Item projects/emudhra-key-was-four/video.json content/video.json

# Test and preview immediately:
npm run draft
npm run preview
```

To archive your current active project before starting a new one:

```bash
# Save your current project:
New-Item -ItemType Directory -Force -Path "projects/my-new-video"
Copy-Item content/video.json "projects/my-new-video/video.json"

# Reset content/video.json to the blank boilerplate template:
Copy-Item content/video.example.json content/video.json
```
