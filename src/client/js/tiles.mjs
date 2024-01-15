/*

Tiles

*/

const RE = 6378137; // Earth Radius
const EPSILON = 1e-14;
const LL_EPSILON = 1e-11;
const CE = 2 * Math.PI * RE; // Circumference of the Earth
const TILE_SIZE = 512;

const geometryTypes = ['Point','LineString','MultiLineString','Polygon','MultiPolygon'];

import Utils from './utils.mjs';
import Draw from './draw.mjs';

import './polygon-clipping.js';

class Tiles {

	constructor(map){
		this.map = map;
		this.storage = {
			tiles: {},
			sorted: {}
		};
		this.utils = new Utils(map);
		this.draw = new Draw(map);
	}

	/*

	Tile

	*/

	tile = coords => {
		let [x,y] = this.utils._xy(coords);

		const Z2 = Math.pow(2, this.map.zoomID);

		if (x <= 0) {
			x = 0;
		} else if (x >= 1) {
			x = parseInt(Z2 - 1);
		} else {
			x = parseInt(Math.floor((x + EPSILON) * Z2));
		}

		if (y <= 0) {
			y = 0;
		} else if (y >= 1) {
			y = parseInt(Z2 - 1);
		} else {
			y = parseInt(Math.floor((y + EPSILON) * Z2));
		}

		return [x,y];
	}

	/*

	Get Tiles

	*/

	get = async () => {
		this.start = new Date();

		let bbox = this.utils.canvasBBox();
		let zoomID = this.map.zoomID;

		if(!this.storage.tiles[zoomID]){
			this.storage.tiles[zoomID] = {};

			this.storage.sorted[zoomID] = JSON.parse(JSON.stringify(this.map.style.groups));
		}



		const xTiles = this.tile([bbox[0], bbox[1]]);
		const yTiles = this.tile([bbox[2] - LL_EPSILON, bbox[3] + LL_EPSILON])

		let x = xTiles[0], xl = yTiles[0] - xTiles[0];

		
		this.await = (yTiles[0] - xTiles[0] + 1) * (yTiles[1] - xTiles[1] + 1);

		for(let x = xTiles[0] ; x <= yTiles[0]; x++){
			for(let y = xTiles[1] ; y <= yTiles[1]; y++){
				let url = `${zoomID}/${x}/${y}`;
				if(typeof this.storage.tiles[zoomID][url] === 'undefined'){
					this.load(zoomID, url);
				} else {
					this.await--;
				}
			}
		}

		/*

		Render Frame

		*/

		if(this.await === 0){
			this.draw.render();
		}

		

		return true;
	}

	/*

	Load Tile

	*/

	load = async (zoomID, url) => {
		let result;
		try {
			let rUrl = `/data/tiles/${url}`;
			result = await(await fetch(rUrl)).text();
		} catch(e){
			// Continue Regardless Error
			result = '0';
		}
		
		this.storage.tiles[zoomID][url] = result;

		if(result !== '0'){
			this.parse(zoomID, url);
		}

		this.await--;

		/*

		Render Frame

		*/

		if(this.await === 0){
			this.draw.render();
		}
		
	}

	/*

	Parse Features

	*/

	parse = (zoomID, url) => {
		let groups = this.storage.sorted[zoomID];

		let tile = this.storage.tiles[zoomID][url];
		let features = tile.split('\n');
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

				delete existed.bounds;

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
}

export default Tiles;