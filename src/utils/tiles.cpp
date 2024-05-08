/*

g++ tiles.cpp -o tiles -lsqlite3
./tiles

*/

#include <iostream>
#include <fstream>

#include <array>
#include <sqlite3.h>
#include "libs/json.hpp"
using json = nlohmann::ordered_json;

#include <cmath>
#include <vector>

#include "libs/print.hpp"
using surfy::print;

json config;


std::vector<double> radians(double lng, double lat) {
	double x = lng / 360.0 + 0.5;
	double sinlat = std::sin(lat * (M_PI / 180.0));
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

	sqlite3* db;
	int rc = sqlite3_open("/storage/maps/tiles/canary/canary.db", &db);
	sqlite3_stmt* stmt;
	const char* sql = "SELECT data FROM config_data WHERE name='bbox'";
	rc = sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr);
	rc = sqlite3_step(stmt); // Execute
	
	const unsigned char* bboxSrc = sqlite3_column_text(stmt, 0);
	json bbox = json::parse(bboxSrc);
	print("BBox: ", bbox);
	
	/*

	Radians of BBox

	*/

	std::vector<double> topLeft = radians(bbox[0], bbox[1]);
	std::vector<double> bottomRight = radians(bbox[2], bbox[3]);
	print("Radians: ", topLeft, bottomRight);
	
	/*

	Tiles

	*/
	
	std::array<int, 10> zoomLevels = {2, 4, 6, 8, 10, 12, 14, 15, 16, 17};
	
	json tiles = json::array();

	for (int zoom : zoomLevels) {
		// print("Zoom: ", zoom);

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

		std::vector<int> bounds = tilesRange(zoom, topLeft[0], topLeft[1], bottomRight[0], bottomRight[1]);

		for (int i = bounds[0]; i <= bounds[2]; ++i) {
			for (int j = bounds[3]; j <= bounds[1]; ++j) {
				tiles.push_back({zoom, i, j, zoomGroupLayers});
			}
		}
		
	}

	return tiles;
}

std::vector<double> getTileBounds(int zoom, int xtile, int ytile) {
    double Z2 = std::pow(2, zoom);

    double ul_lon_deg = xtile / Z2 * 360.0 - 180.0;
    double ul_lat_rad = std::atan(std::sinh(M_PI * (1 - 2 * ytile / Z2)));
    double ul_lat_deg = ul_lat_rad * 180.0 / M_PI;

    double lr_lon_deg = (xtile + 1) / Z2 * 360.0 - 180.0;
    double lr_lat_rad = std::atan(std::sinh(M_PI * (1 - 2 * (ytile + 1) / Z2)));
    double lr_lat_deg = lr_lat_rad * 180.0 / M_PI;

    return {ul_lon_deg, lr_lat_deg, lr_lon_deg, ul_lat_deg};
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

int main() {

	/*

	Config

	*/

	std::string config_name = "canary";

	config = loadJSON("../tiler/configs/" + config_name + ".json");
	json filters = loadJSON("../tiler/config.json");
	config.update(filters);
	
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
	   print(tile);
	}
	*/
	print(tiles[0]);
	std::vector<double> bounds = getTileBounds(tiles[0][0], tiles[0][1], tiles[0][2]);
	print(bounds);

	return 0;
}