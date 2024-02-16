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
	}
}

export default Tiles;