# Tiles Storage

### SVG
```html

<svg>
	<g class="tiles">
		<g class="zoom" zoome="{zoomID}">
			<g class="{group}">
				<g tile="{tileURL}">
					{elements}
				</g>
			</g>
		</g>
	</g>
</svg>

```

### Tiles
```js

map.tiles.storage.tiles = {
	zoomID: {
		container, // g.zoom
		groups: {
			groupID: {
				container, // g.landuse
				tiles: {
					tileID: tileContainer,
					tileID: tileContainer,
					...
				}
			}
		},
		items: {
			// Tiles
			tileID: false,
			tileID: {
				id: tileID,
				containers: [
					GroupTile, // water/tileURL
					GroupTile, // green/tileURL
					...
				],
				src // Unpacked Source
			}
		}

	}
};

```

### Features

```js

map.tiles.storage.features = {

};

```