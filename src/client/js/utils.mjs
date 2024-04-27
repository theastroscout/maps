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

	xy = (coords, offset=true, overlay=false) => {
		const [lng, lat] = coords;
		const mapWidth = Math.pow(2, this.map.view.zoom) * this.map.view.tileSize;

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

	coords = (xy, offset=true, overlay=false) => {
		let [x, y] = xy;
		const mapWidth = Math.pow(2, this.map.view.zoom) * this.map.view.tileSize;

		// If overlay layer
		if(overlay){
			x = (x - this.map.view.width / 2) * this.map.view.scale + this.map.view.x;
			y = (y - this.map.view.height / 2) * this.map.view.scale + this.map.view.y;
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

	Generate ID

	*/

	id = () => {
		return Date.now().toString(36) + Math.random().toString(36).substr(8);
	}
}

export default Utils;