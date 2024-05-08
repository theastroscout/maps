/*

g++ tiles.cpp -o tiles -lsqlite3
./tiles

*/

#include <iostream>
#include <fstream>

#include <array>
#include <sqlite3.h>
#include "libs/json.hpp"
using json = nlohmann::json;

#include <cmath>
#include <vector>

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

std::vector<std::vector<int>> getTiles() {
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
	std::cout << "Bbox: " << bbox << std::endl;
	
	/*

	Radians of BBox

	*/

	std::vector<double> topLeft = radians(bbox[0], bbox[1]);
	std::cout << "Top Left: " << topLeft[0] << ", " << topLeft[1] << std::endl;
	std::vector<double> topRight = radians(bbox[2], bbox[3]);
	std::cout << "Top Right: " << topRight[0] << ", " << topRight[1] << std::endl;
	
	/*

	Tiles

	*/
	
	std::array<int, 10> zoomLevels = {2, 4, 6, 8, 10, 12, 14, 15, 16, 17};
	
	std::vector<std::vector<int>> tiles;

	for (int zoom : zoomLevels) {
		std::cout << "Zoom: " << zoom << std::endl;

		std::vector<int> bounds = tilesRange(zoom, topLeft[0], topLeft[1], topRight[0], topRight[1]);
		std::cout << "Zoom Tiles: " << bounds[0] << ", " << bounds[1] << ", "  << bounds[2] << ", "  << bounds[3] << std::endl;

		for (int i = bounds[0]; i <= bounds[2]; ++i) {
			for (int j = bounds[3]; j <= bounds[1]; ++j) {
				tiles.push_back({zoom, i, j});
			}
		}
		
	}

	return tiles;
}

json getConfig(){
	std::ifstream file("../tiler/config.json");

	if (!file.is_open()) {
		std::cerr << "Error opening Config file." << std::endl;
		return 1;
	}

	std::string jsonString((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());

	// Parse the JSON string
	json config;
	try {
		config = json::parse(jsonString);
	} catch (const std::exception& e) {
		std::cerr << "Error parsing JSON: " << e.what() << std::endl;
		return 1;
	}

	return config;
}

int main() {

	/*

	Config

	*/

	json config = getConfig();
	std::cout << "Config Name: " << config["name"] << std::endl;

	// Groups and Layers Index
	config["group_index"] = {};

	json dict;

	int groupID = 0;
	for (auto& [groupName, groupData] : config["groups"].items()) {

		int layerID = 0;
		json layers;

		for (auto& [layerName, layerData] : groupData.items()) {
			layers[layerName] = {
				{"name", layerName}
			};
		}

		config["group_index"][groupName] = {
			{"id", groupID},
			{"layers", layers}
		};
        groupID++;

        json dictItem = {
        	{"name", groupName},
        	{"layers", layers}
        };

        dict.push_back(dictItem);
    }

    std::cout << "Group Index" << config["group_index"] << std::endl;

	/*
	
	Tiles

	*/

	/*

	std::vector<std::vector<int>> tiles = getTiles();

	// Print the tiles
	for (const auto& tile : tiles) {
	   std::cout << "[" << tile[0] << ", " << tile[1] << ", " << tile[2] << "]" << std::endl;
	}
	*/
	return 0;
}