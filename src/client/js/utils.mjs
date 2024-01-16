/*

Utils

*/

const RE = 6378137; // Earth Radius
const EPSILON = 1e-14;
const LL_EPSILON = 1e-11;
const CE = 2 * Math.PI * RE; // Circumference of the Earth
const TILE_SIZE = 512;

class Utils {

	constructor(map){
		this.map = map;
	}

	/*

	Get Distance Between Two Points

	*/

	dist(a,b){
		let dx = b[0] - a[0];
		let dy = b[1] - a[1];
		return Math.sqrt(dx*dx + dy*dy);
	}

	_xy = coords => {
		const [lng, lat] = coords;
		const x = lng / 360.0 + 0.5;
		const sinlat = Math.sin(lat * Math.PI / 180);
		const y = 0.5 - 0.25 * Math.log((1.0 + sinlat) / (1.0 - sinlat)) / Math.PI;
		return [x,y];
	}

	/*

	Convert Coords to Pixels depends on Canvas size

	*/

	xyCenter = coords => {
		const zoom = 15;//this.map.options.zoom;
		const [lng, lat] = coords;

		// let scale = 360 * this.map.settings.scaleFactor;
		const scale = TILE_SIZE * Math.pow(2, zoom) * 10;
		// let scale = this.map.settings.scaleFactor;
		
		// const x = lng * this.map.settings.scaleFactor;
		// const x =  scale * (lng + 180) / 360;// - 1889830877// + 100000;
		const x = Math.floor(scale * ((lng + 180) / 360));
		// const y = lat * this.map.settings.scaleFactor;

		const sinLat = Math.sin(lat * (Math.PI / 180));
		const y = Math.floor(
			scale * (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI))
			);

		return [x, y];
	}

	xy = coords => {
		const zoom = 15;//this.map.options.zoom;
		const [lng, lat] = coords;

		const [cLng, cLat] = this.map.center;

		// let scale = 360 * this.map.settings.scaleFactor;
		const scale = TILE_SIZE * Math.pow(2, zoom) * 10;
		// let scale = this.map.settings.scaleFactor;
		
		// const x = lng * this.map.settings.scaleFactor;
		// const x =  scale * (lng + 180) / 360;// - 1889830877// + 100000;
		const x = Math.floor(scale * ((lng + 180) / 360)) - cLng;
		// const y = lat * this.map.settings.scaleFactor;

		const sinLat = Math.sin(lat * (Math.PI / 180));
		const y = Math.floor(
			scale * (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI))
			) - cLat;// - 1256938513// + 100000;

		return [Number(x.toFixed(0)), Number(y.toFixed(0))];
	}

	/*

	Get Coordinates From View Box

	*/

	viewBoxCenter = viewBox => {
		viewBox = viewBox || this.map.viewBox;
		const dx = viewBox.x + viewBox.w / 2;
		const dy = viewBox.y + viewBox.h / 2;

		const x = dx * viewBox.scale;
		const y = dy * viewBox.scale;

		const zoom = 15;

		const [cLng, cLat] = this.map.center;

		const scale = TILE_SIZE * Math.pow(2, zoom) * 10;

		const lng = (x + cLng) * 360 / scale - 180;

		const mercatorY = 0.5 - (y + cLat) / scale;
		const lat = (2 * Math.atan(Math.exp(2 * Math.PI * mercatorY)) - Math.PI / 2) * 180 / Math.PI;

		return [Number(lng.toFixed(6)), Number(lat.toFixed(6))];
	}

	/*

	Get Zoom From Scale

	*/

	zoomFromScale = scale => {
		const baseScale = 0.2;
		const zoom = Math.log2(scale / baseScale) + 16;
		return Number(zoom.toFixed(1));
	}

	/*

	Coordinates to Pixel

	*/

	c2p = coords => {
		const [lng, lat] = coords;
		const zoom = this.map.options.zoom;

		const scale = TILE_SIZE * Math.pow(2, zoom); // Total pixel scale at the given zoom level
		const pi = Math.PI;

		// X
		const x = Math.floor(scale * ((lng + 180) / 360));

		// Y
		const sinLat = Math.sin(lat * (pi / 180));
		const y = Math.floor(
		    scale * (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * pi))
		);

		return [x, y];
	}

	/*

	Pixel to Coordinates

	*/

	p2c = coords => {
		const zoom = this.map.options.zoom;
		let [pixelX, pixelY] = coords;
		let lon = (pixelX / Math.pow(2, zoom) / TILE_SIZE) * 360 - 180;
		let n = Math.PI - 2 * Math.PI * (pixelY / Math.pow(2, zoom) / TILE_SIZE);
		let lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

		return [lon, lat];
	}

	/*

	Canvas Boundary Box

	*/

	canvasBBox = () => {
		const center = this.c2p(this.map.options.coords);
		const halfWidth = this.map.width / 2;
		const halfHeight = this.map.height / 2;
		const topLeft = this.p2c([center[0] - halfWidth, center[1] - halfHeight])
		const bottomRight = this.p2c([center[0] + halfWidth, center[1] + halfHeight])
		return [...topLeft, ...bottomRight];
	}

	/*

	Get Value

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

	HEX to RGBA

	*/

	hexToRGBA(hex, opacity=1) {
		hex = hex.replace('#', '');
		const r = parseInt(hex.substring(0, 2), 16);
		const g = parseInt(hex.substring(2, 4), 16);
		const b = parseInt(hex.substring(4, 6), 16);

		return `rgba(${r}, ${g}, ${b}, ${opacity})`;
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

	Is coords visible on canvas

	*/

	isVisible2 = bounds => {
		const [minX, minY, maxX, maxY] = bounds;
		const [canvasMinX, canvasMinY, canvasMaxX, canvasMaxY] = [this.map.viewBox.x, this.map.viewBox.y, this.map.viewBox.x + this.map.viewBox.w, this.map.viewBox.y + this.map.viewBox.h];
		return !(maxX < canvasMinX && minX > canvasMaxX && maxY < canvasMinY && minY > canvasMaxY); 
	}

	isVisible3 = bounds => {
		const [minX, minY, maxX, maxY] = bounds;
		const [canvasMinX, canvasMinY, canvasMaxX, canvasMaxY] = [this.map.viewBox.x, this.map.viewBox.y, this.map.viewBox.x + this.map.viewBox.w, this.map.viewBox.y + this.map.viewBox.h];

		let polygonLeftVisible = minX >= canvasMinX && minX <= canvasMaxX;
		let polygonRightVisible = maxX >= canvasMinX && maxX <= canvasMaxX;
		let polygonTopVisible = minY >= canvasMinY && minY <= canvasMaxY;
		let polygonBottomVisible = maxY >= canvasMinY && maxY <= canvasMaxY;
		return polygonLeftVisible || polygonRightVisible || polygonTopVisible || polygonBottomVisible;
	}

	isVisible = bounds => {
		const [minX, minY, maxX, maxY] = bounds;
		const [canvasMinX, canvasMinY, canvasMaxX, canvasMaxY] = [this.map.viewBox.x, this.map.viewBox.y, this.map.viewBox.x + this.map.viewBox.w, this.map.viewBox.y + this.map.viewBox.h];

		let rectLeftVisible = minX >= canvasMinX && minX <= canvasMaxX;
		let rectRightVisible = maxX >= canvasMinX && maxX <= canvasMaxX;
		let rectTopVisible = minY >= canvasMinY && minY <= canvasMaxY;
		let rectBottomVisible = maxY >= canvasMinY && maxY <= canvasMaxY;
		 return rectLeftVisible || rectRightVisible || rectTopVisible || rectBottomVisible;
	}
}

export default Utils;