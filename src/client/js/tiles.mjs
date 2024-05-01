/*

Surfy° Maps. Tiles

*/

class Tiles {

	constructor(map){
		this.map = map;
		this.storage = {
			tiles: {},
			features: {}
		};

		/*

		Create Tiles Container

		*/

		this.container = document.createElementNS(this.map.svgNS, 'g');
		this.container.classList.add('tiles');
		this.map.container.appendChild(this.container);

	}

	update = () => {
		const zoomID = this.map.zoomID;
		
		/*

		Hide Zoom Group

		*/

		if(zoomID !== this.currentZoomID){

			// Hide Zoom Collection
			if(this.storage.tiles[this.currentZoomID]){
				this.storage.tiles[this.currentZoomID].hide = true;
				this.storage.tiles[this.currentZoomID].container.remove();
			}

			// Show Zoom Collection
			if(this.storage.tiles[zoomID]){
				this.storage.tiles[zoomID].hide = false;
				this.container.appendChild(this.storage.tiles[zoomID].container);
			}

			// Reassign Zoom ID
			this.currentZoomID = zoomID;

		}

		/*

		Create Tile Assets

		*/

		if(!this.storage.tiles[zoomID]){

			/*

			.SurfyMaps > svg.container > .tiles > .zoom[zoom={zoomID}]

			*/

			const container = document.createElementNS(this.map.svgNS, 'g');
			container.classList.add('zoom');
			container.setAttribute('zoom', zoomID);
			this.container.appendChild(container);

			/*

			Create Zoom instance in Tiles

			*/
			
			this.storage.tiles[zoomID] = {
				container: container,
				groups: {}, // Store Groups
				items: {}, // Store Tiles inside Groups
				visible: {}, // To store currently visible tiles
			};

			/*

			Add Boundaries

			*/

			if(this.map.style?.groups.bounds){
				const boundaries = document.createElementNS(this.map.svgNS, 'g');
				boundaries.classList.add('bounds');
				container.appendChild(boundaries);
				this.storage.tiles[zoomID].groups.bounds = {
					container: boundaries
				}
			}

			this.storage.features[zoomID] = {};
		}

		/*

		Get Tiles List

		*/

		const tiles = this.map.utils.tiles(zoomID);
		
		let visibleTiles = {};

		for(let x = tiles[0]; x <= tiles[2]; x++){
			for(let y = tiles[1]; y <= tiles[3]; y++){
				const url = `${zoomID}/${x}/${y}`;
				
				visibleTiles[url] = true;

				if(typeof this.storage.tiles[zoomID].items[url] === 'undefined'){

					/*

					Load Tile

					*/

					this.storage.tiles[zoomID].items[url] = {
						id: url,
						containers: [],
						joinTiles: {}, // To store Join Tiles
					};

					this.load(zoomID, url);

					/*

					Draw Bounding Box

					

					const bounds = this.getBounds([zoomID,x,y]);
					const border = this.map.draw.bounds(bounds, url, this.storage.tiles[zoomID].groups.bounds.container);

					*/

				} else {
					/*

					Show Tile

					*/

					// Remove Tile From Offload List

					if(this.storage.tiles[zoomID].visible[url]){
						delete this.storage.tiles[zoomID].visible[url];
					}

					// Show if it has been hidden
					let tile = this.storage.tiles[zoomID].items[url];
					if(tile && tile.hide){
						tile.hide = false;
						for(let g of tile.containers){
							// g.container.classList.remove('hide');
							// g.parent.classList.remove('hide');
							g.parent.appendChild(g.container);
						}
					}
				}
			}
		}

		/*

		Hide Tiles

		*/

		// Remove joined tiles from the offload list
		for(let url in visibleTiles){
			let tile = this.storage.tiles[zoomID].items[url];
			for(let joinTileURL in tile.joinTiles){
				if(this.storage.tiles[zoomID].visible[joinTileURL]){
					delete this.storage.tiles[zoomID].visible[joinTileURL];
				}
			}
		}

		// Hide invisible tiles
		for(let url in this.storage.tiles[zoomID].visible){
			let tile = this.storage.tiles[zoomID].items[url];
			if(tile && !tile.hide){
				tile.hide = true;
				for(let g of tile.containers){
					// g.classList.add('hide');
					
					// g.remove();
					// console.log('Hide', g, tile)
					g.container.remove();
				}
			}
		}

		// Reassign visible tiles
		this.storage.tiles[zoomID].visible = visibleTiles;
	}

	/*

	Load Tile

	*/

	load = async (zoomID, url) => {
		let result;
		try {
			let rUrl = `${this.map.style.tiles}/${url}`;
			result = await(await fetch(rUrl)).text();
		} catch(e){
			// Continue Regardless Error
			result = '0';
		}
		
		this.storage.tiles[zoomID].items[url].src = result;

		if(result !== '0'){
			this.parse(zoomID, url);
		} else {
			this.storage.tiles[zoomID].items[url] = false;
		}
		
	}
};

export default Tiles;