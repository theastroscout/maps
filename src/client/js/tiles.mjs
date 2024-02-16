/*

Tiles

*/

import './utils/polygon-clipping.js';
const geometryTypes = ['Point','LineString','MultiLineString','Polygon','MultiPolygon'];

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
		this.map.svg.appendChild(this.container);
	}

	/*

	Get Bounds

	*/

	getBounds = tile => {
		const [zoom, xtile, ytile] = tile;
		const Z2 = Math.pow(2, zoom);

		/*

		X

		*/

		const x = xtile / Z2;
		const lng = (x - 0.5) * 360;

		const x2 = (xtile + 1) / Z2;
		const lng2 = (x2 - 0.5) * 360;


		/*

		Y

		*/

		const y = ytile / Z2;
		const sinlat = Math.sin((2 * Math.atan(Math.exp(2 * Math.PI * (0.5 - y)))) - Math.PI / 2);
		const lat = Math.asin(sinlat) * (180 / Math.PI);

		const y2 = (ytile+1) / Z2;
		const sinlat2 = Math.sin((2 * Math.atan(Math.exp(2 * Math.PI * (0.5 - y2)))) - Math.PI / 2);
		const lat2 = Math.asin(sinlat2) * (180 / Math.PI);

		return [lng, lat, lng2, lat2];
		
	}

	/*

	Tile

	*/

	tile = (zoom, coords, max) => {
		const [x, y] = this.map.utils._xy(coords);
		const Z2 = Math.pow(2, zoom);

		let xtile;

		if(x <= 0){
			xtile = 0
		} else if(x >= 1){
			xtile = parseInt(Z2 - 1, 10);
		} else if(max){
			xtile = parseInt(Math.ceil(x * Z2), 10);
			
		} else {
			xtile = parseInt(Math.floor(x * Z2), 10);
			
		}

		let ytile;

		if(y <= 0){
			ytile = 0;
		} else if(y >= 1){
			ytile = parseInt(Z2 - 1, 10);
		} else if(max){
			ytile = parseInt(Math.ceil(y * Z2), 10);
		} else {
			ytile = parseInt(Math.floor(y * Z2), 10);
		}

		return [xtile, ytile]
	}

	/*

	Get Tiles

	*/

	get = () => {
		const zoomID = this.map.zoomID;

		/*

		Hide Zoom Group

		*/

		if(zoomID !== this.currentZoomID){

			// Hide Zoom Collection
			if(this.storage.tiles[this.currentZoomID]){
				this.storage.tiles[this.currentZoomID].container.classList.add('hide');
				this.storage.tiles[this.currentZoomID].hide = true;
			}

			// Show Zoom Collection
			if(this.storage.tiles[zoomID]){
				this.storage.tiles[zoomID].container.classList.remove('hide');
				this.storage.tiles[zoomID].hide = false;
			}

			// Reassign Zoom ID
			this.currentZoomID = zoomID;

		}

		/*

		Create Tile Assets

		*/

		if(!this.storage.tiles[zoomID]){
			const container = document.createElementNS(this.map.svgNS, 'g');
			container.classList.add('zoom');
			container.setAttribute('zoom', zoomID);
			this.container.appendChild(container);

			let groups = {};
			let groupsSrc = Object.keys(this.map.style.groups);
			for(let group of groupsSrc){
				groups[group] = {};
			}
			
			this.storage.tiles[zoomID] = {
				container: container,
				groups: groups, // Store Groups
				items: {}, // Store Tiles inside Groups
				visible: {}, // To store currently visible tiles
			};

			/*

			Add Boundaries

			*/

			if(this.storage.tiles[zoomID].groups.bounds){
				const boundaries = document.createElementNS(this.map.svgNS, 'g');
				boundaries.classList.add('bounds');
				container.appendChild(boundaries);
				this.storage.tiles[zoomID].groups.bounds.container = boundaries;
			}

			this.storage.features[zoomID] = {};
		}

		/*

		Get Tiles List

		*/

		const bbox = this.map.utils.canvasBBox();

		const xTiles = this.tile(zoomID, [bbox[0], bbox[1]]);
		const yTiles = this.tile(zoomID, [bbox[2], bbox[3]], true);

		let visibleTiles = {};

		for(let x = xTiles[0]; x < yTiles[0]; x++){
			for(let y = xTiles[1]; y < yTiles[1]; y++){
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

					*/

					const bounds = this.getBounds([zoomID,x,y]);
					const border = this.map.draw.bounds(bounds, url, this.storage.tiles[zoomID].groups.bounds.container);

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
							g.classList.remove('hide');
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
					g.classList.add('hide');
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

	/*

	Parse Features

	*/

	parse = (zoomID, url) => {
		let zoomObj = this.storage.tiles[zoomID];
		let tile = zoomObj.items[url];
		let features = tile.src.split('\n');
			features.pop(); // Remove Last Empty Line

		let processed = {};

		for(let item of features){
			let chunks = item.split('\t');
			let coords = JSON.parse(chunks.pop());


			const fID = chunks.shift();
			const geomID = parseInt(chunks.shift(), 10);
			const geomType = geometryTypes[geomID];
			const groupID = parseInt(chunks.shift(), 10);
			const group = this.map.style.config[groupID];
			const groupName = group.name;

			const layerID = parseInt(chunks.shift(), 10);
			const layer = group.layers[layerID];
			console.log(groupName, layer.name, geomType)
		}

		this.map.draw.render(processed);
	}
}

export default Tiles;