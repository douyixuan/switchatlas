---
title: Home
mode: wide
---

# Welcome to SwitchAtlas

A comprehensive, visualized database of mechanical keyboard switches.

<CardGroup cols={2}>
  <Card title="Gateron" icon="keyboard" href="/data/vendors/Gateron/Ink/Black_V2">
    Explore smooth linear switches
  </Card>
  <Card title="Cherry" icon="cherry" href="/data/vendors/Cherry/MX/Red">
    The classic standard
  </Card>
   <Card title="Akko" icon="palette" href="/data/vendors/Akko/CS/Matcha_Green">
    Affordable custom switches
  </Card>
   <Card title="TTC" icon="bolt" href="/data/vendors/TTC/Gold_Pink">
    High performance switches
  </Card>
</CardGroup>

## About
This database collects specifications, force curves, and images for thousands of mechanical switches. 

## Data Sources
The data in SwitchAtlas is aggregated from multiple sources to provide the most comprehensive database possible:
- **ThereminGoat's Force Curves**: A significant portion of the force curve data and basic specifications are imported from [ThereminGoat's Repository](https://github.com/ThereminGoat/force-curves). We attribute all force curve data to their original authors.
- **Manual Curation**: High-quality specifications and images are manually curated by the community.
- https://lumekeebs.com
- https://www.switchesdb.com

## Project Structure
The project uses a file-system based database approach for easy maintenance and contribution.

```
.
├── data/
│   ├── vendors/         # Popular vendors (Shown in navigation)
│   │   ├── Cherry/
│   │   ├── Gateron/
│   │   └── ...
│   └── other_vendors/   # Archive of other vendors
├── mint.json            # Mintlify configuration (Navigation logic)
└── scripts/             # Maintenance scripts (Import, Migration, Config Gen)
```

## Development
This project is built using [Mintlify](https://mintlify.com/).

### Prerequisites
- Node.js installed
- Mintlify CLI: `npm i -g mintlify`

### Running Locally
To preview the documentation site locally:
```bash
mintlify dev
```

### Automation Scripts
- **`scripts/generate_mint_config.js`**: Regenerates `mint.json` based on the directories in `data/vendors`. Run this after adding new popular vendors.
- **`scripts/reorganize_vendors.js`**: Utility to move non-popular vendors to the `other_vendors` directory.


