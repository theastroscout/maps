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
			tiles: {},
			sorted: {}
		};
		this.utils = new Utils(map);
		this.draw = new Draw(map);
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
		this.start = new Date();

		let bbox = this.utils.canvasBBox();
		if(!this.asd){
			this.asd = true;
			this.draw.rect(bbox, 'Canvas Bounds');
		}
		
		let zoomID = this.map.zoomID;
			zoomID = 14;

		if(!this.storage.tiles[zoomID]){
			this.storage.tiles[zoomID] = {};

			this.storage.sorted[zoomID] = JSON.parse(JSON.stringify(this.map.style.groups));
		}

		const xTiles = this.tile(zoomID, [bbox[0], bbox[1]]);
		// const yTiles = this.tile(zoomID, [bbox[2] - LL_EPSILON, bbox[3] + LL_EPSILON], true)
		const yTiles = this.tile(zoomID, [bbox[2], bbox[3]], true);
		console.log(xTiles, yTiles);

		// this.await = (yTiles[0] - xTiles[0] + 1) * (yTiles[1] - xTiles[1] + 1);

		for(let x = xTiles[0]; x < yTiles[0]; x++){
			for(let y = xTiles[1]; y <= yTiles[1]; y++){
				let url = `${zoomID}/${x}/${y}`;
				if(typeof this.storage.tiles[zoomID][url] === 'undefined'){
					//console.log('Render', url);
					// await this.load(zoomID, url);
					if(['14/8190/5448','14/8191/5447','14/8189/5447'].includes(url)){
						await this.load(zoomID, url);
					}
					let bounds = this.getBounds([zoomID,x,y]);
					this.draw.rect(bounds, url);
					this.storage.tiles[zoomID][url] = 1;
				} else {
					// console.log('Skip', url);
				}
			}
		}

		/*

		Render Frame

		*/

		this.draw.render();		

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
		
		this.storage.tiles[zoomID][url] = result;

		if(result !== '0'){
			this.parse(zoomID, url);
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