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
						containers: [],
						joinTiles: {}, // To store Join Tiles
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

			const group = this.map.style.groups[groupName];

			let feature = {
				id: fID,
				tileID: tile.id,
				group: groupName,
				type: geometryTypes[geomType],
				coords: coords,
				bounds: [Infinity,Infinity,-Infinity,-Infinity]
			};

			if(Number.isInteger(Number(chunks[0]))){
				feature.layer = layers[groupName][chunks.shift()];
			}

			if(chunks[0]){
				feature.name = chunks.shift();
			}

			/*

			Append Feature

			*/

			let featureItem = this.storage.features[zoomID][feature.id];

			if(!featureItem){

				if(feature.type === 'LineString'){
					feature.type = 'MultiLineString';
					feature.coords = [feature.coords]
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
						tiles: {},
						layers: {}
					};

					if(feature.group === 'roads'){
						// Definitions
						const defs = document.createElementNS(this.map.svgNS, 'defs');
						zoomObj.groups[feature.group].container.appendChild(defs);

						// Create Borders Container
						const border = document.createElementNS(this.map.svgNS, 'g');
						border.classList.add('border');
						zoomObj.groups[feature.group].container.appendChild(border);

						// Create Fill Container
						const fill = document.createElementNS(this.map.svgNS, 'g');
						fill.classList.add('fill');
						zoomObj.groups[feature.group].container.appendChild(fill);
					}
				}

				/*

				Create Layers

				*/

				if(feature.layer && !zoomObj.groups[feature.group].layers[feature.layer]){

					

					zoomObj.groups[feature.group].layers[feature.layer] = {
						defs: defs,
						border: layerBorder,
						fill: layerFill
					};
				}

				/*

				Create Tile if none exists

				*/

				if(!zoomObj.groups[feature.group].tiles[url]){
					const tileContainer = document.createElementNS(this.map.svgNS, 'g');
					tileContainer.setAttribute('tile', url);
					zoomObj.groups[feature.group].container.appendChild(tileContainer);

					zoomObj.groups[feature.group].tiles[url] = tileContainer;

					tile.containers.push(tileContainer);
				}

				// Attach Tile Container to the Feature
				feature.container = zoomObj.groups[feature.group].tiles[url];



				

				/*

				Roads

				*/

				if(feature.group === 'roads'){

					/*
					if(!tile.roads){
						tile.roads = {
							layers: {}
						};

						const defs = document.createElementNS(this.map.svgNS, 'defs');
						zoomObj.groups[feature.group].tiles[url].appendChild(defs)
						tile.roads.defs = defs;

						// Create Border Layer
						const border = document.createElementNS(this.map.svgNS, 'g');
						border.classList.add('border');
						zoomObj.groups[feature.group].tiles[url].appendChild(border);
						tile.roads.border = border;

						// Create Fill Layer
						const fill = document.createElementNS(this.map.svgNS, 'g');
						fill.classList.add('fill');
						zoomObj.groups[feature.group].tiles[url].appendChild(fill);
						tile.roads.fill = fill;
					}

					// console.log(feature.layer)

					if(!tile.roads.layers[feature.layer]){
						const layerBorder = document.createElementNS(this.map.svgNS, 'g');
						layerBorder.classList.add(feature.layer);
						tile.roads.border.appendChild(layerBorder);

						const layerFill = document.createElementNS(this.map.svgNS, 'g');
						layerFill.classList.add(feature.layer);
						tile.roads.fill.appendChild(layerFill);

						tile.roads.layers[feature.layer] = {
							border: layerBorder,
							fill: layerFill
						};
					}

					feature.roads = tile.roads;
					*/
				}

				/*

				Create New One Feature

				*/

				this.storage.features[zoomID][feature.id] = feature;
				featureItem = this.storage.features[zoomID][feature.id];

			} else {

				/*

				Join Features

				*/

				tile.joinTiles[featureItem.tileID] = true;

				/*

				Union Features

				*/

				if(feature.type === 'MultiLineString'){
					featureItem.coords = [...featureItem.coords, ...feature.coords];
				} else if(feature.type === 'LineString'){
					featureItem.coords.push(feature.coords);

				} else if(/Polygon/.test(feature.type)){

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