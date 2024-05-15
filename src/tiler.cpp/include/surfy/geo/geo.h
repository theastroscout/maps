#ifndef SURFY_GEO_HPP
#define SURFY_GEO_HPP

namespace surfy::geo {

	struct Tile {
		int zoom;
		int x;
		int y;
		std::vector<std::string> group_layer;
	};

	using Tiles = std::vector<Tile>;

	std::vector<double> radians(double lng, double lat) {
		double x = lng / 360.0 + 0.5;
		double sinlat = std::sin(lat * M_PI / 180.0);
		double y = 0.5 - 0.25 * std::log((1.0 + sinlat) / (1.0 - sinlat)) / M_PI;

		return {x, y};
	}

	/*

	std::vector<int> bounds = tilesRange(zoom, westSouth[0], westSouth[1], eastNorth[0], eastNorth[1]);
	
	for (int x = bounds[0]; x < bounds[2]; ++x) {
		for (int y = bounds[1]; y < bounds[3]; ++y) {
			{zoom, x, y};
		}
	}

	*/

	std::vector<int> tilesRange(int zoom, double x1, double y1, double x2, double y2) {
		int Z2 = std::pow(2, zoom);

		int west = static_cast<int>(std::floor(x1 * Z2));
		int north = static_cast<int>(std::floor(y1 * Z2));
		int east = static_cast<int>(std::ceil(x2 * Z2));
		int south = static_cast<int>(std::ceil(y2 * Z2));

		return {west, north, east, south};
	}

	/*

	Get Tile BBox

	*/

	std::string getTileBBox(int zoom, int xtile, int ytile) {
		double Z2 = std::pow(2, zoom);

		double west = xtile / Z2 * 360.0 - 180.0;
		double northRad = std::atan(std::sinh(M_PI * (1 - 2 * ytile / Z2)));
		double north = northRad * 180.0 / M_PI;

		double east = (xtile + 1) / Z2 * 360.0 - 180.0;
		double southRad = std::atan(std::sinh(M_PI * (1 - 2 * (ytile + 1) / Z2)));
		double south = southRad * 180.0 / M_PI;

		// Stringify automaticaly rounds float to 6 decimals
		std::vector<double> tile = {
			west,
			north,
			east,
			south
		};

		std::string polygon = "(" +
			std::to_string(tile[2]) + " " + std::to_string(tile[3]) + ", " +
			std::to_string(tile[2]) + " " + std::to_string(tile[1]) + ", " +
			std::to_string(tile[0]) + " " + std::to_string(tile[1]) + ", " +
			std::to_string(tile[0]) + " " + std::to_string(tile[3]) + ", " +
			std::to_string(tile[2]) + " " + std::to_string(tile[3]) + ")";
		return polygon;
	}

	Tiles getTiles() {
		
		/*

		Get BBox from DB

		*/

		json bboxData = db.findOne("SELECT data FROM config_data WHERE name='bbox'");
		json bbox = bboxData["data"];
		print("BBox: ", bbox);
		
		/*

		Radians of BBox
		Collect Tiles From West to East from South to North

		*/

		std::vector<double> westSouth = radians(bbox[0], bbox[3]);
		std::vector<double> eastNorth = radians(bbox[2], bbox[1]);
		
		/*

		Tiles

		*/
		
		std::array<int, 10> zoomLevels = { 2, 4, 6, 8, 10, 12, 14, 15, 16, 17 };
		// std::array<int, 1> zoomLevels = { 2 };
		
		// json tiles = json::array();
		Tiles tiles;

		for (int zoom : zoomLevels) {

			std::vector<std::string> zoomGroupLayers;

			for (const auto& [groupName, groupData] : config["groups"].items()) {
				for (const auto& [layerName, layerData] : groupData.items()) {
					if (layerData["minzoom"] <= zoom) {
						zoomGroupLayers.push_back(groupName + ':' + layerName);
					}
				}
			}

			if (zoomGroupLayers.empty()) {
				continue;
			}

			std::vector<int> bounds = tilesRange(zoom, westSouth[0], westSouth[1], eastNorth[0], eastNorth[1]);

			for (int x = bounds[0]; x < bounds[2]; ++x) {
				for (int y = bounds[1]; y < bounds[3]; ++y) {
					tiles.push_back({zoom, x, y, zoomGroupLayers});
				}
			}
			
		}

		return tiles;
	}
}

#endif