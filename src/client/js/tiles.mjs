/*

Surfy° Maps. Tiles

*/

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
		this.map.container.appendChild(this.container);

	}

	update = () => {
		const zoomID = this.map.zoomID;
		
		/*

		Hide Zoom Group

		*/

		if(zoomID !== this.currentZoomID){

			// Hide Zoom Collection
			if(this.storage.tiles[this.currentZoomID]){
				this.storage.tiles[this.currentZoomID].hide = true;
				this.storage.tiles[this.currentZoomID].container.remove();
			}

			// Show Zoom Collection
			if(this.storage.tiles[zoomID]){
				this.storage.tiles[zoomID].hide = false;
				this.container.appendChild(this.storage.tiles[zoomID].container);
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

			/*

			Create Zoom instance in Tiles

			*/
			
			this.storage.tiles[zoomID] = {
				container: container,
				groups: {}, // Store Groups
				items: {}, // Store Tiles inside Groups
				visible: {}, // To store currently visible tiles
			};

			/*

			Add Boundaries

			*/

			if(this.map.style?.groups.bounds){
				const boundaries = document.createElementNS(this.map.svgNS, 'g');
				boundaries.classList.add('bounds');
				container.appendChild(boundaries);
				this.storage.tiles[zoomID].groups.bounds = {
					container: boundaries
				}
			}

			this.storage.features[zoomID] = {};
		}
	}
};

export default Tiles;