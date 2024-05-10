/*

sudo apt-get install libboost-all-dev

*/

#include <iostream>
#include <fstream>

#include <array>
#include <sqlite3.h>
#include "libs/json.hpp"
using json = nlohmann::ordered_json;

#include <cmath>
#include <vector>

#include "libs/sqlite.hpp"
surfy::SQLite db;

#include "libs/print.hpp"
using surfy::print;

/*

Boost

*/

#include <boost/geometry.hpp>
namespace bg = boost::geometry;
typedef bg::model::d2::point_xy<double> point_type;
typedef bg::model::polygon<point_type> polygon_type;
typedef bg::model::linestring<point_type> linestring_type;
typedef bg::model::multi_polygon<bg::model::polygon<point_type>> multipolygon_type;


// Global Config
json config;


std::vector<double> radians(double lng, double lat) {
	double x = lng / 360.0 + 0.5;
	double sinlat = std::sin(lat * M_PI / 180.0);
	double y = 0.5 - 0.25 * std::log((1.0 + sinlat) / (1.0 - sinlat)) / M_PI;

	return {x, y};
}

std::vector<int> tilesRange(int zoom, double x1, double y1, double x2, double y2) {
	int Z2 = std::pow(2, zoom);

	int west = static_cast<int>(std::floor(x1 * Z2));
	int north = static_cast<int>(std::floor(y1 * Z2));
	int east = static_cast<int>(std::ceil(x2 * Z2));
	int south = static_cast<int>(std::ceil(y2 * Z2));

	return {west, north, east, south};
}

json getTiles() {
	
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
	
	json tiles = json::array();

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

std::string getTilePolygon(int zoom, int xtile, int ytile) {
	double Z2 = std::pow(2, zoom);

	double upperLeftLngDeg = xtile / Z2 * 360.0 - 180.0;
	double upperLeftLatRad = std::atan(std::sinh(M_PI * (1 - 2 * ytile / Z2)));
	double upperLeftLatDeg = upperLeftLatRad * 180.0 / M_PI;

	double lowerRightLngDeg = (xtile + 1) / Z2 * 360.0 - 180.0;
	double lowerRightLatRad = std::atan(std::sinh(M_PI * (1 - 2 * (ytile + 1) / Z2)));
	double lowerRightLatDeg = lowerRightLatRad * 180.0 / M_PI;

	// Stringify automaticaly rounds float to 6 decimals
	std::vector<double> tile = {
		upperLeftLngDeg,
		upperLeftLatDeg,
		lowerRightLngDeg,
		lowerRightLatDeg
	};

	std::string polygon = "POLYGON (" +
		std::to_string(tile[0]) + " " + std::to_string(tile[1]) + ", " +
		std::to_string(tile[2]) + " " + std::to_string(tile[1]) + ", " +
		std::to_string(tile[2]) + " " + std::to_string(tile[3]) + ", " +
		std::to_string(tile[0]) + " " + std::to_string(tile[3]) + ", " +
		std::to_string(tile[0]) + " " + std::to_string(tile[1]) + ")";
	return polygon;
}

json loadJSON(const std::string& path) {
	std::ifstream file(path);

	if (!file.is_open()) {
		std::cerr << "Error opening Config file. " << path << std::endl;
		return 1;
	}

	std::string jsonString((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());

	// Parse the JSON string
	json jsonData;
	try {
		jsonData = json::parse(jsonString);
	} catch (const std::exception& e) {
		std::cerr << "Error parsing JSON: " << e.what() << std::endl;
		return 1;
	}

	return jsonData;
}

void callback(const json& data) {
	print("One by one Callback Result", data);
}

int parseTile(json tile) {
	std::string boundsPoly = getTilePolygon(tile[0], tile[1], tile[2]);
	
	std::string placeholders;
	int size = tile[3].size();
	for (int i = 0; i < size; ++i) {
		placeholders += "?,";
	}
	placeholders.erase(placeholders.size() - 1);
	
	std::string query = "SELECT id, oid, group_layer, `group`, layer, data, ST_AsText(coords) AS coords FROM features WHERE group_layer IN ("+placeholders+") and Intersects(coords, ST_GeomFromText(?));";

	std::vector<std::string> params = tile[3];
	params.push_back(boundsPoly);
	
	json features = db.find(query, params);
	
	// print("Features", features);

	if (features.empty()) {
		return 0;
	}

	for (const auto& feature : features) {
		// print(feature);
		
		std::string geom = feature["coords"];
		std::string geom_type;
		if (geom.find("POINT") != std::string::npos) {
			geom_type = "point";
			point_type point;
			bg::read_wkt(geom, point);
		} else if (geom.find("MULTIPOLYGON") != std::string::npos) {
			geom_type = "multi_polygon";
			multipolygon_type multi_polygon;
			bg::read_wkt(geom, multi_polygon);
		} else if (geom.find("POLYGON") != std::string::npos) {
			geom_type = "polygon";
			polygon_type polygon;
			bg::read_wkt(geom, polygon);
		} else if (geom.find("LINESTRING") != std::string::npos) {
			geom_type = "linestring";
			linestring_type linestring;
			bg::read_wkt(geom, linestring);
		} else {
			print("Unknown Geometry Type", geom);
		}
		// bg::read_wkt(wkt_string, geom);
	}

	return 1;
}

int main() {

	/*

	Config

	*/

	std::string config_name = "canary";

	config = loadJSON("../tiler/configs/" + config_name + ".json");
	json filters = loadJSON("../tiler/config.json");
	config.update(filters);

	// Initialise DB
	db.connect("/storage/maps/tiles/canary/canary.db", true);
	db.query("SELECT load_extension('mod_spatialite')");
	
	// Just...
	print("Config Name: ", config["name"]);

	std::string configPath = config["data"];
	configPath += "/config.json";
	print("Config Path: " + configPath);

	// Groups and Layers Index
	config["group_index"] = {};

	json tilesDict;

	int groupID = 0;
	for (auto& [groupName, groupData] : config["groups"].items()) {

		int layerID = 0;
		json layers;

		for (auto& [layerName, layerData] : groupData.items()) {

			layers[layerName] = {
				{"name", layerName},
				{"data", layerData["data"]}
			};
		}

		config["group_index"][groupName] = {
			{"id", groupID},
			{"layers", layers}
		};
		groupID++;

		json dictItem = {
			{"id", groupID},
			{"name", groupName},
			{"layers", layers}
		};

		tilesDict.push_back(dictItem);
	}

	// Save JSON to file
	std::ofstream outputFile(configPath);
	if (outputFile.is_open()) {
		outputFile << json(tilesDict).dump(1, '\t'); // Dump the JSON object to the file
		outputFile.close();
		print("New Tiles Dictionary saved to file: " + configPath);
	} else {
		print("Unable to open Tiles Dictionary: " + configPath);
	}

	/*
	
	Tiles

	*/

	json tiles = getTiles();
	
	/*
	for (const auto& tile : tiles) {
		// print(tile);
		std::string boundsPoly = getTilePolygon(tile[0], tile[1], tile[2]);

		std::string placeholders;
		int size = tile[3].size();
		for (int i = 0; i < size; ++i) {
			placeholders += "?,";
		}
		placeholders.erase(placeholders.size() - 1);

		std::string query = "SELECT id, oid, group_layer, `group`, layer, data, Hex(ST_AsBinary(coords)) as coords FROM features WHERE group_layer IN (" + placeholders + ") and Intersects(coords, ST_GeomFromText(?))";

		std::vector<std::string> params = tile[3];
		params.push_back(boundsPoly);
		
		json features = db.findSync(query, params);

		if (features["status"] == false) {
			
		} else {
			print(features);
		}
	}
	*/

	parseTile(tiles[800]);
	
	
	

	return 0;
}