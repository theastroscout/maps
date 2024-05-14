#include <chrono>
#include <thread>
#include <atomic>

#include <iostream>
#include <fstream>
#include <vector>

#include "include/json.h"
using json = nlohmann::ordered_json;

#include "include/surfy/geom/geom.h"
namespace sg = surfy::geom;

#include "include/print.h"
using surfy::print;

#include "include/sqlite.h"
surfy::SQLite db;


// Global Config
json config;

/*

Load JSON

*/

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

std::string getTileBox(int zoom, int xtile, int ytile) {
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

void parseTile(surfy::SQLite& dbT, const json& tile) {

	// Get Tile BBox
	std::string boundsBox = getTileBox(tile[0], tile[1], tile[2]);
	// print("Tile BBox", boundsBox);
	

	std::string placeholders;
	int size = tile[3].size();
	for (int i = 0; i < size; ++i) {
		placeholders += "?,";
	}
	placeholders.erase(placeholders.size() - 1);
	
	std::string query = "SELECT id, oid, group_layer, `group`, layer, data, ST_AsText(coords) AS coords FROM features WHERE group_layer IN ("+placeholders+") and Intersects(bounds, ST_GeomFromText(?));";

	std::vector<std::string> params = tile[3];
	params.push_back("POLYGON (" + boundsBox + ")");
	
	// Find all features inside Tile BBox
	json features = dbT.find(query, params);
	
	

	if (features.empty()) {
		return;
	}

	int n = 0;

	for (const auto& feature : features) {
		// print(feature);
		
		sg::Shape geom = sg::Shape(feature["coords"]);
		n++;
	}

	// print("Created: ", n);

	// return 1;
}

void processVector(const json& tiles, int threadId, std::atomic<int>& progress){
	surfy::SQLite dbT;
	// std::string path = "/storage/maps/tiles/london/london." + (std::to_string(threadId)) + ".db";
	// std::string path = "/storage/maps/tiles/london/london." + (std::to_string(threadId)) + ".db";
	std::string path = "/storage/maps/tiles/london/london.db";
	dbT.connect(path.c_str(), true);
	dbT.query("SELECT load_extension('mod_spatialite');");
	dbT.query("PRAGMA synchronous = OFF;");
	dbT.query("PRAGMA page_size = 4096;");
	dbT.query("PRAGMA journal_mode = MEMORY;");

	print("Thread: ", threadId, tiles.size());

	for (size_t i = 0; i < tiles.size(); ++i) {
        // Your processing logic here
        // std::cout << "Thread " << threadId << ": Processing element " << tiles[i] << std::endl;
        ++progress;
        parseTile(dbT, tiles[i]);
    }

    print(">>>>> Complete", threadId, tiles.size());

    

    // progress += tiles.size();
}

void printProgress(std::atomic<int>& progress, size_t totalElements) {
    while (progress < totalElements) {
        // std::cout << "Progress: " << (progress * 100 / totalElements) << "%" << << std::endl;
        print("Progress:", std::to_string(progress * 100 / totalElements) + "%", progress, totalElements);
        std::this_thread::sleep_for(std::chrono::seconds(1));
    }
}


int main() {

	/*

	Config

	*/

	std::string config_name = "london";

	config = loadJSON("../tiler/configs/" + config_name + ".json");
	json filters = loadJSON("../tiler/config.json");
	config.update(filters);

	// Initialise DB
	db.connect("/storage/maps/tiles/london/london.db", true);
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

	auto start = std::chrono::high_resolution_clock::now();


	json tiles = getTiles();
	/*
	for (const auto& tile : tiles) {
		// parseTile(tile);
	}*/

	
	unsigned int maxThreads = std::thread::hardware_concurrency();
	// print("maxThreads", maxThreads);

	const int numThreads = 6;
	size_t elementsPerThread = tiles.size() / numThreads;
	print("Pull Size:", elementsPerThread);
	

	// Create threads and assign work to each thread
    std::vector<std::thread> threads;
    std::atomic<int> progress(0);

    json pool = json::array();
    for (int i = 0; i < numThreads; ++i) {
        size_t startIdx = i * elementsPerThread;
        size_t endIdx = (i == numThreads - 1) ? tiles.size() : (i + 1) * elementsPerThread;
        print(startIdx, endIdx);
        json bucket = json::array();
        for (int j = startIdx; j < endIdx; ++j) {
        	bucket.push_back(tiles[j]);
        }

        print("Bucket info: ", i, startIdx, endIdx, bucket.size());
        pool.push_back(bucket);

        
        // json subVector(tiles.begin() + startIdx, tiles.begin() + endIdx);

        // threads.emplace_back(processVector, std::ref(myVector), i, std::ref(progress));
    }

    for (int i = 0; i < numThreads; ++i) {
    	threads.emplace_back(processVector, std::ref(pool[i]), i, std::ref(progress));
    }

    // Create a thread to print progress
    std::thread progressThread(printProgress, std::ref(progress), tiles.size());

    // Wait for all threads to finish
    for (auto& thread : threads) {
        thread.join();
    }
   	progressThread.join();

    // print(vecSize * sizeof(int))

	auto end = std::chrono::high_resolution_clock::now();
	auto duration_seconds = std::chrono::duration_cast<std::chrono::duration<double>>(end - start);
    std::cout << "Execution time: " << duration_seconds.count() << " seconds" << std::endl;

	return 0;
}