---
type: relationships
name: Character Relationships
relationshipsConfig:
  nodes:
    - id: aldren
      x: 600
      y: 300
      label: "Aldren"
      destinationTag: "aldren"
      color: "#e74c3c"
      description: "The King."
    - id: cael
      x: 980
      y: 520
      label: "Cael"
      destinationTag: "cael"
      color: "#3498db"
    - id: maren
      x: 320
      y: 560
      label: "Maren"
      destinationTag: "maren"
      color: "#2ecc71"
    - id: oswin
      x: 660
      y: 760
      label: "Oswin"
      destinationTag: "oswin"
      color: "#f1c40f"
    - id: corvin
      x: 1100
      y: 220
      label: "Corvin"
      destinationTag: "corvin"
      color: "#9b59b6"
  edges:
    - from: aldren
      to: cael
      label: "sent on quest"
      color: "#3498db"
      style: solid
      direction: forward
    - from: aldren
      to: corvin
      label: "distrusts"
      color: "#e74c3c"
      style: dashed
      direction: both
    - from: maren
      to: cael
      label: "guides"
      color: "#2ecc71"
      style: solid
      direction: forward
    - from: oswin
      to: aldren
      label: "sworn to"
      color: "#f1c40f"
      style: dotted
      direction: forward
  edgePresets:
    - name: Family
      color: "#f1c40f"
      style: solid
      direction: both
    - name: Allies
      color: "#2ecc71"
      style: solid
      direction: both
    - name: Enemies
      color: "#e74c3c"
      style: dashed
      direction: both
    - name: Romance
      color: "#e84393"
      style: solid
      direction: both
---
