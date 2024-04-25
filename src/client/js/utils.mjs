/*

Surfy° Maps. Utils

*/

class Utils {
	
	constructor(map){
		this.map = map;
	}

	xy = (coords, offset=true, custom=false) => {

		/*

		Convert coordinates to pixels
		@coords - [lng, lat]
		@offset - substruct origin coords of the map

		*/

		const [lng, lat] = coords;
		const scale = Math.pow(2, this.map.view.zoom) * this.map.view.tileSize;
		let x = Math.round((lng + 180) / 360 * scale);

		const radians = lat * Math.PI / 180;
		const mercatorY = Math.log(Math.tan((Math.PI / 4) + (radians / 2)));
		let y = Math.round((1 - (mercatorY / Math.PI)) / 2 * scale);

		if(offset){
			x -= this.map.view.origin[0];
			y -= this.map.view.origin[1];
		}

		// If custom layer
		if(custom){
			x = x / this.map.view.scale + this.map.view.width / 2 - this.map.view.xy[0];
			y = y / this.map.view.scale + this.map.view.height / 2 - this.map.view.xy[1];
		}

		return [x, y];
	}

	coords = (xy, custom=false) => {

		/*

		Convert pixels to coordinates
		@xy - [x,y]

		*/

		let [x, y] = xy;
		x += this.map.view.origin[0];
		y += this.map.view.origin[1];
		
		// If custom layer
		if(custom){
			x = x * this.map.view.scale - this.map.view.width / 2 + this.map.view.xy[0];
			y = y * this.map.view.scale - this.map.view.height / 2 + this.map.view.xy[1];
		}

		const scale = Math.pow(2, this.map.view.zoom) * this.map.view.tileSize;
		let lng = (x / scale) * 360 - 180;
		const mercatorY = (1 - (2 * y / scale)) * Math.PI;
		let lat = (2 * Math.atan(Math.exp(mercatorY)) - Math.PI / 2) * (180 / Math.PI);

		
		return [ Math.round(lng * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6 ];
	}
}

export default Utils;