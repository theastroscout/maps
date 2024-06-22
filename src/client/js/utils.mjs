/*

Surfy° Maps. Utils

*/

class Utils {
	
	constructor(map){
		this.map = map;
	}

	/*

	Geo Coordinates to page XY
	@offset - substruct center of the map
	@overlay - to overlay frame of reference

	*/

	xy = (coords, offset=true, overlay=false, zoom) => {
		const [lng, lat] = coords;
		const mapWidth = Math.pow(2, zoom || this.map.view.zoom) * this.map.view.tileSize;

		let x = (lng + 180) * (mapWidth / 360);
		const radians = lat * Math.PI / 180;
		const mercatorY = Math.log(Math.tan((Math.PI / 4) + (radians / 2)));
		let y = mapWidth / 2 - (mapWidth * mercatorY) / (2 * Math.PI);

		// Substruct center to change frame of reference
		if(offset){
			x -= this.map.view.origin[0];
			y -= this.map.view.origin[1];
		}

		// If overlay layer
		if(overlay){
			x = (x - this.map.view.x) / this.map.view.scale + this.map.view.width / 2;
			y = (y - this.map.view.y) / this.map.view.scale + this.map.view.height / 2;
		}

		x = Math.round( x * 100 ) / 100;
		y = Math.round( y * 100 ) / 100;

		return [x, y];
	}

	/*

	page XY to Geo Coordinates
	@offset - center of the map was substructed
	@overlay - if overlay frame of reference was implimented

	*/

	coords = (xy, offset=true, overlay=false, zoom) => {
		let [x, y] = xy;
		const mapWidth = Math.pow(2, this.map.view.zoom) * this.map.view.tileSize;

		let scale = this.map.view.scale * 1;
		if(zoom){
			scale =  Math.pow(2, this.map.view.zoom  + (this.map.view.zoom - zoom)) / this.map.view.tileSize;
		}

		// If overlay layer
		if(overlay){
			x = (x - this.map.view.width / 2) * scale + this.map.view.x;
			y = (y - this.map.view.height / 2) * scale + this.map.view.y;
		}

		// Add center to change frame of reference
		if(offset){
			x += this.map.view.origin[0];
			y += this.map.view.origin[1];
		}

		// Longitude
		let lng = x / (mapWidth / 360) - 180;
		

		// Latitude
		const mercatorY = (mapWidth / 2 - y) * (2 * Math.PI) / mapWidth;
		const radians = (Math.atan(Math.exp(mercatorY)) - Math.PI / 4) * 2;
		let lat = radians * 180 / Math.PI;
		
		// Round up to 6 decimals
		return [ Math.round(lng * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6 ];
	}

	/*

	Canvas BBox

	*/

	canvasBBox = () => {
		let bbox = [...this.coords([0,0], true, true), ...this.coords([this.map.view.width, this.map.view.height], true, true)];
		return bbox;
	}

	/*

	Tile

	*/

	radians = coords => {
		const [lng, lat] = coords;
		const x = lng / 360.0 + 0.5;
		
		const sinlat = Math.sin(lat * ( Math.PI / 180 ));
		const y = 0.5 - 0.25 * Math.log((1.0 + sinlat) / (1.0 - sinlat)) / Math.PI;

		return [x, y];
	}

	tiles = zoom => {

		const bbox = this.canvasBBox();
		this.map.options.bbox = bbox;

		const [x1, y1] = this.radians([bbox[0], bbox[1]]);
		const [x2, y2] = this.radians([bbox[2], bbox[3]]);

		const Z2 = Math.pow(2, zoom);

		let west = parseInt(Math.floor(x1 * Z2), 10);
		let north = parseInt(Math.floor(y1 * Z2), 10);
		let east = parseInt(Math.ceil(x2 * Z2), 10);
		let south = parseInt(Math.ceil(y2 * Z2), 10);

		return [west, north, east, south];
	}

	/*

	Generate ID

	*/

	id = () => {
		return Date.now().toString(36) + Math.random().toString(36).substr(8);
	}

	/*

	Get Style Value

	*/

	getValue = (matrix, easing='linear', zoom=this.map.options.zoom) => {
		
		// If only one value
		if(!matrix[0]){
			return matrix;
		}

		matrix = [...matrix]; // Copy Obj

		let first = matrix[0];
		if(zoom <= first[0]){
			return first[1];
		}

		let last = matrix.pop();
		if(zoom >= last[0]){
			return last[1];
		}

		for(let i=0,l=matrix.length; i<l; i++){
			const r = matrix[i];
			const next = matrix[i+1] || last;
			if(zoom > r[0] && zoom <= next[0]){
				const time = (zoom - r[0]) / (next[0] - r[0]);
				return Number(this.easing[easing](r[1], next[1], time).toFixed(2));
			}
		}

		return false;
	}

	/*

	Easing
	
	*/

	easing = {

		/*

		Linear

		*/

		linear: (start, end, t) => {
			return (1 - t) * start + t * end;
		},

		/*

		Ease In Quart

		*/

		easeInQuart: (start, end, t) => {
			const tNormalized = t / 1;
			const changeInValue = end - start;
			return changeInValue * tNormalized * tNormalized * tNormalized * tNormalized + start;
		},

		/*

		Ease In Expo

		*/

		easeInExpo: (start, end, t, base=1.5) => {
			return start === end ? start : (end - start) * Math.pow(base, 10 * (t - 1)) + start;
		}
	}

	/*

	Get Tile Bounds

	*/

	getTileBounds = tile => {
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
}

export default Utils;