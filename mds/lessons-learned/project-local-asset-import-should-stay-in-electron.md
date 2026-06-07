# Project-local asset import should stay in Electron

When a renderer workflow needs to bring an external file into the project tree, keep the actual filesystem copy in Electron instead of trying to make the renderer own both file browsing and writes.

Why this works better:

- the renderer can ask for intent (`selectMapImage`) without gaining arbitrary filesystem write responsibility
- the backend can enforce the project-root destination (`res/`) and collision-safe naming in one place
- the created markdown file and copied asset stay in one transaction-shaped repository operation (`createMapDocument`)
- future asset-backed document types can reuse the same pattern instead of inventing ad-hoc renderer file handling

For Trama, map creation follows this rule: the sidebar dialog chooses an external image, Electron copies it into `res/`, and the repository writes the new `type: map` markdown file with `markers: []`.
