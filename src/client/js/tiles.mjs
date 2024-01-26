/*

Tiles

*/

const RE = 6378137; // Earth Radius
// const EPSILON = 1e-14;
const EPSILON = 0;
const LL_EPSILON = 1e-11;
// const LL_EPSILON = 1e-5;
const CE = 2 * Math.PI * RE; // Circumference of the Earth
const TILE_SIZE = 512;

const geometryTypes = ['Point','LineString','MultiLineString','Polygon','MultiPolygon'];

import Utils from './utils.mjs';
import Draw from './draw.mjs';

import './utils/polygon-clipping.js';

class Tiles {

	constructor(map){

		this.map = map;
		this.storage = {
			// sorted: {},

			tiles: {},
			features: {}
		};

		this.currentZoomID = this.map.zoomID;

		this.utils = new Utils(map);
		this.draw = new Draw(map);

		/*

		Create Tiles Container

		*/

		this.container = document.createElementNS(this.map.svgNS, 'g');
		this.container.classList.add('tiles');
		this.map.svg.appendChild(this.container);
	}

	/*

	Tile

	*/

	tile = (zoom, coords, max) => {
		const [x, y] = this.utils._xy(coords);
		const Z2 = Math.pow(2, zoom);

		let xtile;

		if(x <= 0){
			xtile = 0
		} else if(x >= 1){
			xtile = parseInt(Z2 - 1, 10);
		} else if(max){
			xtile = parseInt(Math.ceil((x + EPSILON) * Z2), 10);
			
		} else {
			xtile = parseInt(Math.floor((x - EPSILON) * Z2), 10);
			
		}

		let ytile;

		if(y <= 0){
			ytile = 0;
		} else if(y >= 1){
			ytile = parseInt(Z2 - 1, 10);
		} else if(max){
			ytile = parseInt(Math.ceil((y + EPSILON) * Z2), 10);
		} else {
			ytile = parseInt(Math.floor((y - EPSILON) * Z2), 10);
		}

		return [xtile, ytile]
	}

	/*

	Get Tiles

	*/

	get = async () => {

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

			const boundaries = document.createElementNS(this.map.svgNS, 'g');
			boundaries.classList.add('bounds');
			container.appendChild(boundaries);
			
			this.storage.tiles[zoomID] = {
				container: container,
				boundaries: boundaries,
				groups: {}, // Store Groups
				items: {}, // Store Tiles inside Groups
				visible: {}, // To store currently visible tiles
			};

			this.storage.features[zoomID] = {};
		}

		/*

		Get Tiles List

		*/

		const bbox = this.utils.canvasBBox();

		const xTiles = this.tile(zoomID, [bbox[0], bbox[1]]);
		const yTiles = this.tile(zoomID, [bbox[2], bbox[3]], true);

		let visibleTiles = {};

		for(let x = xTiles[0]; x < yTiles[0]; x++){
			for(let y = xTiles[1]; y < yTiles[1]; y++){
				let url = `${zoomID}/${x}/${y}`;

				visibleTiles[url] = true;

				if(typeof this.storage.tiles[zoomID].items[url] === 'undefined'){

					/*

					Load Tile

					*/

					this.storage.tiles[zoomID].items[url] = {
						id: url,
						containers: []
					};

					this.load(zoomID, url);

					/*

					Draw Bounding Box

					*/

					const bounds = this.getBounds([zoomID,x,y]);
					const border = this.draw.bounds(bounds, url, this.storage.tiles[zoomID].boundaries);

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

	get2 = async () => {
		this.start = new Date();

		let bbox = this.utils.canvasBBox();

		/*
		if(!this.asd){
			this.asd = true;
			const canvasBox = this.draw.rect(bbox, 'Init Canvas Bounds');
			canvasBox.setAttribute('name','initCanvasBox');
		}
		*/
		
		let zoomID = this.map.zoomID;
		// zoomID = 14;

		/*

		Hide Zoom Collection and Reassign Current Zoom ID

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
			container.setAttribute('zoom', zoomID);
			container.classList.add('zoom');

			this.container.appendChild(container);

			this.storage.tiles[zoomID] = {
				// container: container,
				groups: {},
				visible: {},
				items: {}
			};

			this.storage.features[zoomID] = {};
			// this.storage.sorted[zoomID] = JSON.parse(JSON.stringify(this.map.style.groups));
		}

		const xTiles = this.tile(zoomID, [bbox[0], bbox[1]]);
		// const yTiles = this.tile(zoomID, [bbox[2] - LL_EPSILON, bbox[3] + LL_EPSILON], true)
		const yTiles = this.tile(zoomID, [bbox[2], bbox[3]], true);
		// console.log(xTiles, yTiles);

		// this.await = (yTiles[0] - xTiles[0]) * (yTiles[1] - xTiles[1]);

		let visible = {};

		for(let x = xTiles[0]; x < yTiles[0]; x++){
			for(let y = xTiles[1]; y < yTiles[1]; y++){
				let url = `${zoomID}/${x}/${y}`;
				
				visible[url] = true;

				if(typeof this.storage.tiles[zoomID].items[url] === 'undefined'){
					//console.log('Render', url);
					// await this.load(zoomID, url);

					let container = document.createElementNS(this.map.svgNS, 'g');
						container.setAttribute('tile', url);
						container.classList.add('tile');

					this.storage.tiles[zoomID].container.append(container);

					/*

					Create Groups and Layers

					*/

					let groups = {};

					for(let groupName in this.map.style.groups){
						const group = this.map.style.groups[groupName];
						// console.log(group)
						let groupEl = document.createElementNS(this.map.svgNS, 'g');
						groupEl.classList.add(group.name);

						/*

						Layers

						*/

						let layers = {};
						for(let layer of group.layers){
							let layerEl = document.createElementNS(this.map.svgNS, 'g');
							layerEl.classList.add(layer);
							groupEl.appendChild(layerEl);
							layers[layer] = layerEl;
						}

						// Append Group to Tile Container
						container.appendChild(groupEl);

						groups[group.name] = {
							container: groupEl,
							layers: layers
						};
					}

					const bounds = this.getBounds([zoomID,x,y]);
					const border = this.draw.bounds(bounds, url, container);
					// this.storage.src[zoomID][url] = 1;

					/*

					Extend Bounds while adding features

					*/

					this.storage.tiles[zoomID].items[url] = {
						id: url,
						bounds: bounds,
						hide: false,
						border: border,
						container: container,
						groups: groups,
						joinTiles: {},
						features: {}
					};

					// if(['14/8190/5448','14/8191/5447','14/8189/5447'].includes(url)){
					// if(['14/8190/5448','14/8191/5448'].includes(url)){
						this.load(zoomID, url);
					// }

				} else {

					// Remove Tile From Offload List

					if(this.storage.tiles[zoomID].visible[url]){
						delete this.storage.tiles[zoomID].visible[url];
					}

					// Show if it has been hidden
					let tile = this.storage.tiles[zoomID].items[url];
					if(tile.hide){
						tile.container.classList.remove('hide');
						tile.hide = false;
					}
				}
			}
		}

		/*

		Offload Unused Tiles

		*/

		// Remove joined tiles from the offload list
		for(let url in visible){
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
			tile.container.classList.add('hide');
			tile.hide = true;
		}

		// Reassign visible tiles
		this.storage.tiles[zoomID].visible = visible;



		/*

		Render Frame

		*/

		// this.draw.render();	

		return true;
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

		const groupsMap = ['water','landuse','green','bridges','roads','railways','buildings'];
		const layers = {
			roads: ['streets','highways']
		}

		let zoomObj = this.storage.tiles[zoomID];
		let tile = zoomObj.items[url];
		let features = tile.src.split('\n');
			features.pop(); // Remove Last Empty Line

		let processed = {};

		for(let item of features){
			let chunks = item.split('\t');
			let coords = JSON.parse(chunks.pop());
			
			const fID = chunks.shift();
			const geomType = chunks.shift();
			const groupName = groupsMap[chunks.shift()];

			if(groupName !== 'landuse'){
				// continue;
			}

			const group = this.map.style.groups[groupName];

			let feature = {
				id: fID,
				group: groupName,
				type: geometryTypes[geomType],
				coords: coords,
				bounds: [Infinity,Infinity,-Infinity,-Infinity]
			};

			if(Number(chunks[0])){
				feature.layer = layers[groupName][chunks.shift()];
			}

			if(chunks[0]){
				feature.name = chunks.shift();
			}

			/*

			Create Group if none exists

			*/

			if(!zoomObj.groups[feature.group]){
				
				// Create Container
				const container = document.createElementNS(this.map.svgNS, 'g');
				container.classList.add(feature.group);
				zoomObj.container.appendChild(container);

				// Create Group Object
				zoomObj.groups[feature.group] = {
					container: container,
					tiles: {}
				};
			}

			/*

			Create Tile if none exists

			*/

			if(!zoomObj.groups[feature.group].tiles[url]){
				const tileContainer = document.createElementNS(this.map.svgNS, 'g');
				tileContainer.setAttribute('tile',url);
				zoomObj.groups[feature.group].container.appendChild(tileContainer);

				zoomObj.groups[feature.group].tiles[url] = tileContainer;

				tile.containers.push(tileContainer);
			}

			// Attach Tile Container to the Feature
			feature.container = zoomObj.groups[feature.group].tiles[url];

			/*

			Append Feature

			*/

			let featureItem = this.storage.features[zoomID][feature.id];

			if(!featureItem){

				/*

				Create New One

				*/

				this.storage.features[zoomID][feature.id] = feature;
				featureItem = this.storage.features[zoomID][feature.id];

			} else {

				/*

				Join Features

				*/

				// tile.joinTiles[featureItem.tileID] = true;

				/*

				Union Features

				*/

				if(/Polygon/.test(feature.type)){

					const union = polygonClipping.union(featureItem.coords, feature.coords);
					// console.log(featureItem.coords)
					// console.log(union)
					// console.log('')
					
					featureItem.type = 'MultiPolygon';
					featureItem.coords = union;
					
				}
			}

			processed[feature.id] = featureItem;

		}

		this.draw.render(processed);
	}

	parse2 = (zoomID, url) => {

		let processed = {};

		let tile = this.storage.tiles[zoomID].items[url];
		let srcTile = tile.src;
		let features = srcTile.split('\n');
			features.pop(); // Remove Last Empty Line

		let groupsMap = ['water','landuse','green','tunnels','roads','railways','buildings'];

		for(let item of features){
			let chunks = item.split('\t');
			let coords = JSON.parse(chunks.pop());

			const groupName = groupsMap[chunks[2]];
			const group = this.map.style.groups[groupName];
			
			const layer = group.layers[chunks[3]];
			const container = tile.groups[group.name].layers[layer];

			/*

			Create Assets

			*/

			if(!this.storage.tiles[zoomID].groups[groupName]){
				const container = document.createElementNS(this.map.svgNS, 'g');
				container.classList.add(groupName);
				this.storage.tiles[zoomID].container.appendChild(container);

				this.storage.tiles[zoomID].groups[groupName] = {
					container: container,
					tiles: {}
				};
			}

			if(!this.storage.tiles[zoomID].groups[groupName].tiles[url]){
				const container = document.createElementNS(this.map.svgNS, 'g');
				container.setAttribute('tile', url);
				container.classList.add('tile');
				this.storage.tiles[zoomID].groups[groupName].container.appendChild(container);

				this.storage.tiles[zoomID].groups[groupName].tiles[url] = {
					container: container
				};
			}

			/*

			Feature Object

			*/

			let feature = {
				id: chunks[0],
				tileID: tile.id,
				type: geometryTypes[chunks[1]],
				group: group.name,
				layer: layer,
				container: container,
				coords: coords
			};

			// Get Name
			if(chunks[4]){
				feature.name = chunks[4];
			}

			// Get Center
			if(chunks[5]){
				feature.center = chunks[5].split(',').map(Number);
			}

			/*

			Feature Pointer

			*/

			let featureItem = this.storage.features[zoomID][feature.id];

			if(!featureItem){

				// Prepare a LineString for future merges

				if(feature.type === 'LineString'){
					feature.type = 'MultiLineString';
					feature.coords = [feature.coords];
				}

				this.storage.tiles[zoomID].items[url].features[feature.id] = feature;

				/*

				Create New One

				*/

				this.storage.features[zoomID][feature.id] = this.storage.tiles[zoomID].items[url].features[feature.id];
				featureItem = this.storage.features[zoomID][feature.id];
				
			} else {

				/*

				Add original tile to this one to keep them both visible

				*/

				// tile.joinTiles[featureItem.tileID] = true;

				/*

				Union Features

				*/

				if(/Polygon/.test(feature.type)){
					const union = polygonClipping.union(featureItem.coords, feature.coords);
					featureItem.coords = union;
				}

			}

			// featureItem.tiles[url] = 1;

			processed[feature.id] = featureItem;
		}

		this.draw.render(processed);
	}

	parse_draft = (zoomID, url) => {
		let groups = this.storage.sorted[zoomID];

		let srcTile = this.storage.tiles[zoomID].items[url].src;
		let features = srcTile.split('\n');
			features.pop(); // Remove Last Empty Line

		for(let item of features){
			let chunks = item.split('\t');
			let coords = JSON.parse(chunks.pop());
			const group = this.map.styleMap[chunks[2]];

			/*

			Feature Object

			*/

			let feature = {
				id: chunks[0],
				type: geometryTypes[chunks[1]],
				group: group.name,
				layer: group.layers[chunks[3]],
				coords: coords,
				tiles: []
			};

			if(feature.layer !== 'water'){
				// continue;
			}

			// Get Name
			if(chunks[4]){
				feature.name = chunks[4];
			}

			// Get Center
			if(chunks[5]){
				feature.center = chunks[5].split(',').map(Number);
			}

			let existed = groups[feature.group].layers[feature.layer].features[feature.id];

			if(!existed){

				/*

				New Feature

				*/

				feature.tiles.push(url);

				if(feature.type === 'LineString'){
					feature.type = 'MultiLineString';
					feature.coords = [feature.coords];
				}

				groups[feature.group].layers[feature.layer].features[feature.id] = feature;

			} else {

				/*

				Feature Item Exists

				*/

				existed.updated = true;

				if(!existed.tiles.includes(url)){
					existed.tiles.push(url);
				}

				if(feature.type === 'MultiLineString'){
					existed.coords = [...existed.coords, ...feature.coords];
				} else if(feature.type === 'LineString'){
					existed.coords.push(feature.coords);
				} else if(/Polygon/.test(feature.type)){
					const union = polygonClipping.union(existed.coords, feature.coords);
					existed.coords = union;
				}
			}
		}
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

		const x = xtile / Z2 - EPSILON;
		const lng = (x - 0.5) * 360;

		const x2 = (xtile + 1) / Z2 - EPSILON;
		const lng2 = (x2 - 0.5) * 360;


		/*

		Y

		*/

		const y = ytile / Z2 + EPSILON;
		const sinlat = Math.sin((2 * Math.atan(Math.exp(2 * Math.PI * (0.5 - y)))) - Math.PI / 2);
		const lat = Math.asin(sinlat) * (180 / Math.PI);

		const y2 = (ytile+1) / Z2 + EPSILON;
		const sinlat2 = Math.sin((2 * Math.atan(Math.exp(2 * Math.PI * (0.5 - y2)))) - Math.PI / 2);
		const lat2 = Math.asin(sinlat2) * (180 / Math.PI);

		const bounds = [lng, lat, lng2, lat2];
		return bounds;
		
	}
}

export default Tiles;