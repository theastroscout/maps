/*

Surfy° Maps. Utils

*/

class Utils {
	
	constructor(map){
		this.map = map;
	}

	xy = (coords, offset=true) => {

		/*

		Convert coordinates to pixels
		@coords - [lng, lat]
		@offset - substruct origin coords of the map

		*/

		const [lng, lat] = coords;
		// const scale = Math.pow(2, this.map.options.zoom) * this.map.options.tileSize;
		const scale = Math.pow(2, this.map.options.zoom) * this.map.options.tileSize;
		let x = Math.round((lng + 180) / 360 * scale);

		const radians = lat * Math.PI / 180;
		const mercatorY = Math.log(Math.tan((Math.PI / 4) + (radians / 2)));
		let y = Math.round((1 - (mercatorY / Math.PI)) / 2 * scale);

		if(offset){
			x -= this.map.view.origin[0];
			y -= this.map.view.origin[1];
		}

		return [x, y];
	}
}

export default Utils;