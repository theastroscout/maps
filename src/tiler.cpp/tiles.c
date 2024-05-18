#include <chrono>
#include <thread>
#include <atomic>

#include <iostream>
#include <fstream>
#include <vector>

#include <regex>

#include <filesystem>
namespace fs = std::filesystem;

#include "include/json.h"
using json = nlohmann::ordered_json;

#include "include/surfy/surfy.h"
#include "include/surfy/utils/utils.h"
using surfy::utils::print;

#include "include/surfy/geom/geom.h"
namespace sg = surfy::geom;

#include "include/surfy/geo/geo.h"

#include "include/surfy/sqlite/sqlite.h"
surfy::SQLite db;

std::regex bracket_pattern("\\s*\\(.*?\\)\\s*");

// Global Config
json config;
std::array<int, 10> zoomLevels = { 2, 4, 6, 8, 10, 12, 14, 15, 16, 17 };
std::vector<json> layersConfig = json::array();

struct Row {
	int oid;
	int geomType;
	int layerID;
	std::string data;
	std::string geom;

	std::string toString() {
		return std::to_string(oid) + "\t" +
			   std::to_string(geomType) + "\t" +
			   std::to_string(layerID) + "\t" +
			   data + "\t" +
			   geom;
	}
};


/*

Process Features and create Tiles

config["group_index"]: {
	"areas": {
		"id": 0,
		"layers": {
			"boundaries": {
				"name": "boundaries",
				"data": [],
				"minzoom": 8
			},
			"layerName": {
				"maxzoom": 14
			},
			"landuse": {
				"name": "landuse",
				"data": [],
				"minzoom": 10
			}
		}
	}
}

*/

void writeOrAppendToFile(const std::string& filePath, const std::string& line) {
	std::fstream file;
	if (std::filesystem::exists(filePath)) {
		// File exists, open in append mode
		file.open(filePath, std::ios::out | std::ios::app);
		if (!file.is_open()) {
			std::cerr << "Error opening file for appending: " << filePath << std::endl;
			return;
		}
		file << line << std::endl;
	} else {
		// File does not exist, create and write the first line
		file.open(filePath, std::ios::out);
		if (!file.is_open()) {
			std::cerr << "Error creating file: " << filePath << std::endl;
			return;
		}
		file << line << std::endl;
	}
	file.close();
}

/*

void featureHandler_work(const json& feature) {

	sg::Shape shape(feature["coords"], true);
	const json& layerConfig = layersConfig[feature["layer_idx"]];

	std::array<double, 2> westSouth;
	std::array<double, 2> eastNorth;

	// print(feature);
	// print("Shaped Feature", shape);

	if (shape.type == "Polygon") {
		westSouth = surfy::geo::normalize(shape.bbox[0], shape.bbox[3]);
		eastNorth = surfy::geo::normalize(shape.bbox[2], shape.bbox[1]);

		for (int zoom : zoomLevels) {
			if (zoom >= layerConfig["minzoom"]) {
				const std::string zoomStr = std::to_string(zoom);
				std::array<int, 4> bounds = surfy::geo::tiles(zoom, westSouth[0], westSouth[1], eastNorth[0], eastNorth[1]);
				
				 // Number of Tiles for one Zoom, if more than 1, need to clip.
				bool clip = ((bounds[2] - bounds[0]) * (bounds[3] - bounds[1]) > 1);

				for (int x = bounds[0]; x < bounds[2]; ++x) {
					for (int y = bounds[1]; y < bounds[3]; ++y) {
						// print(zoom, x, y, clip);
						
						sg::Shape newShape = shape;

						if (clip) {
							sg::Coords mask = surfy::geo::tileBBox(zoom, x, y);
							newShape.clip(mask);
						}
					

						if (layerConfig.contains("compress") && layerConfig["compress"].contains(zoomStr)) {
							const json& compressor = layerConfig["compress"][zoomStr];

							if (compressor.contains("simplify")) {
								newShape.simplify(compressor["simplify"]);
							}

							if (compressor.contains("drop") && newShape.area < compressor["drop"]) {
								continue;
							}
						}

						Row line({
							feature["oid"],
							shape.typeID,
							feature["layer_idx"],
							"",
							newShape.compressed()
						});

						std::string path = config["data"].get<std::string>() + "/" + std::to_string(zoom) + "/" + std::to_string(x);
						fs::create_directories(path);

						std::string tilePath = path + "/" + std::to_string(y);

						writeOrAppendToFile(tilePath, line.toString());
						
					}
				}
			}
		}
	}
}
*/
/*
void parsePolygon(const sg::Shape& shape, const int& zoom, const int& x, const int& y, bool& clip, const json& layerConfig, const json& feature) {

	const std::string zoomStr = std::to_string(zoom);
	sg::Shape newShape = shape;

	if (clip) {
		sg::Coords mask = surfy::geo::tileBBox(zoom, x, y);
		newShape.clip(mask);
	}
					

	if (layerConfig.contains("compress") && layerConfig["compress"].contains(zoomStr)) {
		const json& compressor = layerConfig["compress"][zoomStr];

		if (compressor.contains("simplify")) {
			newShape.simplify(compressor["simplify"]);
		}

		if (compressor.contains("drop") && newShape.area < compressor["drop"]) {
			return;
		}
	}

	Row line({
		feature["oid"],
		shape.typeID,
		feature["layer_idx"],
		"",
		newShape.compressed()
	});

	std::string path = config["data"].get<std::string>() + "/" + std::to_string(zoom) + "/" + std::to_string(x);
	fs::create_directories(path);

	std::string tilePath = path + "/" + std::to_string(y);

	writeOrAppendToFile(tilePath, line.toString());
}
*/

std::string featureData(const json& feature, const json& layerConfig) {
	std::string data;

	if (layerConfig.contains("data") && feature.contains("data")) {
		bool first = true;
		for (const auto& item : layerConfig["data"]) {
			if (!first) {
				data += '\t';
			}

			std::string k = item["key"];
			
			if (feature["data"].contains(k)) {
				
				std::string v = feature["data"][k];

				if (item["type"].is_string()) {

					if (item["type"] == "*") {
						v = std::regex_replace(v, bracket_pattern, "");
						data += v;
					} else if (item["type"] == "bool") {
						data += "1";
					}

				} else if (item["type"].is_array()) {

					for (int i = 0, l = item["type"].size(); i < l; ++i) {
						if (item["type"][i]["name"] == v) {
							data += std::to_string(i);
							break;
						}
					}
				}
			}

			first = false;
		}
	}

	return data;
}

void polygon(sg::types::Polygon& polygon, const json& layerConfig) {
	/*
	if (layerConfig.contains("compress") && layerConfig["compress"].contains(zoomStr)) {
		const json& compressor = layerConfig["compress"][zoomStr];

		if (compressor.contains("simplify")) {
			newShape.simplify(compressor["simplify"]);
		}

		if (compressor.contains("drop") && newShape.area < compressor["drop"]) {
			return;
		}
	}*/
}

void featureHandler(const json& feature) {

	/*

	For any polygon default Simplifier is .00001

	*/

	sg::Shape shape(feature["coords"], true);
	const json& layer = layersConfig[feature["layer_id"]];

	std::array<double, 2> westSouth;
	std::array<double, 2> eastNorth;

	std::string data = featureData(feature, layer);

	print(feature);
	print(shape.type);

	/*

	Prepare a Row to write to the file

	*/

	Row row({
		feature["id"],
		shape.typeID,
		feature["layer_id"],
		data
	});

	if (shape.type == "Point") {

		westSouth = surfy::geo::normalize(shape.geom.point.x, shape.geom.point.y);

		row.geom = shape.compressed();

		std::string stringLine = row.toString();

		for (int zoom : zoomLevels) {
			if (zoom >= layer["minzoom"]) {
				std::array<int, 2> tile = surfy::geo::tile(zoom, westSouth[0], westSouth[1]);
				print("Store Point:", zoom, tile[0], tile[1], "Data:", stringLine);
			}
		}

	} else if (shape.type == "Polygon" || shape.type == "MultiPolygon") {
		westSouth = surfy::geo::normalize(shape.bbox[0], shape.bbox[3]);
		eastNorth = surfy::geo::normalize(shape.bbox[2], shape.bbox[1]);


		for (int zoom : zoomLevels) {
			
			if (zoom >= layer["minzoom"]) {

				const std::string zoomStr = std::to_string(zoom);

				// Get all tiles
				std::array<int, 4> tiles = surfy::geo::tiles(zoom, westSouth[0], westSouth[1], eastNorth[0], eastNorth[1]);
				
				/*

				Number of Tiles for one Zoom, if more than 1, we need to clip.

				*/

				bool clip = ((tiles[2] - tiles[0]) * (tiles[3] - tiles[1]) > 1);

				for (int x = tiles[0]; x < tiles[2]; ++x) {
					for (int y = tiles[1]; y < tiles[3]; ++y) {

						sg::Shape newShape = shape;

						if (shape.type == "Polygon") {
							
							if (layer.contains("compress") && layer["compress"].contains(zoomStr)) {
								const json& compressor = layer["compress"][zoomStr];

								if (compressor.contains("simplify")) {
									newShape.simplify(compressor["simplify"]);
								}

								if (compressor.contains("drop") && newShape.area < compressor["drop"]) {
									continue;
								}
							}

							if (clip) {
								sg::Coords mask = surfy::geo::tileBBox(zoom, x, y);
								newShape.clip(mask);
							}

							row.geom = newShape.compressed();
							print("Store Polygon:", zoom, x, y, "Data:", row.toString());

						} else {

							/*

							MultiPolygon

							*/

							row.geom = newShape.compressed();
							print("Store MultiPolygon:", zoom, x, y, "Data:", row.toString());
						}
						
					}
				}
			}
		}
	}
}

class Parser {
	unsigned int maxThreads;
	unsigned int numThreads;
	std::vector<std::thread> threads;
	std::atomic<int> progress;
	int bucketSize;
	int chunkSize;

	using Bucket = std::vector<int>;
	using Pool = std::vector<Bucket>;
	Pool pool;

private:
	std::mutex queue_mutex;

public:

	Parser(const int total, const int bucketSize, const int chunkSize, unsigned int numberOfThreads=0) : bucketSize(bucketSize), chunkSize(chunkSize) {

		maxThreads = std::thread::hardware_concurrency();
		if (numberOfThreads == 0) {
			numberOfThreads = 4;
		}
		numThreads = std::min(numberOfThreads, maxThreads);
		progress = 0;

		for (int i = 0; i < total; i += bucketSize) {
			int start = i;
			int end = std::min(i + bucketSize, total);

			Bucket bucket({start, end});
			pool.push_back(bucket);
		}

		print("Pool size: " + std::to_string(pool.size()));

		for (int threadID = 0; threadID < numThreads; ++threadID) {
			threads.emplace_back([this, threadID] {
				processor(threadID, std::ref(pool), std::ref(progress));
			});
		}

		for (auto& thread : threads) {
			thread.join();
			print("Process finished");
		}

		print("All Processes are finished", pool.size());
	}

	void processor(const int& threadID, Pool& pool, std::atomic<int>& progress) {
		surfy::SQLite dbT;
		dbT.connect(config["db_file"].get<std::string>(), true);
		dbT.query("SELECT load_extension('mod_spatialite')");


		while (true) {
			
			std::unique_lock<std::mutex> lock(queue_mutex);

			if (!pool.size()) {
				break;
			}

			Bucket bucket = pool.front();
			pool.erase(pool.begin());

			lock.unlock();

			int start = bucket[0];
			int end = bucket[1];
			int from;
			int limit;

			for (int i = start; i < end; i += chunkSize) {
				from = i;
				limit = (from + chunkSize > end) ? (end - from) : chunkSize;

				std::string query = "SELECT id, oid, layer_id, group_layer, `group`, layer, data, coords FROM features LIMIT " + std::to_string(limit) + " OFFSET " + std::to_string(from);
				dbT.find(query, {}, featureHandler);
			}

			// print("Thread Done #" + std::to_string(threadID), from + limit);
		}
	}
};


int main() {

	/*

	Config

	*/

	std::string config_name = "isle-of-dogs.v2";

	config = surfy::utils::json::load("../tiler/configs/" + config_name + ".json");
	json filters = surfy::utils::json::load("../tiler/config.json");
	config.update(filters);

	// Initialise DB
	db.connect(config["db_file"].get<std::string>(), true);

	// Just...
	print("Config Name: ", config["name"]);
	std::string configPath = config["data"];

	/*

	Wipe tiles directory

	*/
	
	for (const auto& entry : fs::directory_iterator(config["data"].get<std::string>())) {
		fs::remove_all(entry.path());
	}

	/*

	Create Config Map

	*/

	
	configPath += "/config.json";
	print("Config Path: " + configPath);

	// json tilesConfig = json::array({ { "name", "undefined" } });
	json tilesConfig = json::array();

	int layerID = 0;
	for (auto& [groupName, groupData] : config["groups"].items()) {

		for (auto& [layerName, layerData] : groupData.items()) {	

			json layerConfig = {
				{ "id", layerID },
				{ "group", groupName },
				{ "layer", layerName }
			};

			if (layerData.contains("minzoom")) {
				layerConfig["minzoom"] = layerData["minzoom"];
			}

			if (layerData.contains("data")) {
				layerConfig["data"] = layerData["data"];
			}

			if (layerData.contains("compress")) {
				layerConfig["compress"] = layerData["compress"];
			}

			layersConfig.push_back(layerConfig);

			json tileConfig = {
				{ "group", groupName },
				{ "layer", layerName }
			};

			if (layerData.contains("data")) {
				tileConfig["data"] = layerData["data"];
			}

			tilesConfig.push_back(tileConfig);

			layerID++;
		}
	}

	

	// Save Tiles Confgi to file
	surfy::utils::json::save(configPath, tilesConfig);

	json bboxData = db.findOne("SELECT data FROM config WHERE name='bbox'");
	json bbox = bboxData["data"];
	print("BBox: ", bbox);

	
	/*

	Test Isle of Dogs
	29 - Point
	2052 - House Polygon
	11189 - House MultiPolygon

	*/

	std::string query = "SELECT id, oid, layer_id, group_layer, `group`, layer, data, coords FROM features WHERE id=11189";
	json result = db.findOne(query);
	
	if (result["_status"] == true) {
		featureHandler(result);
	}
	
	return 0;


	json featuresCount = db.findOne("SELECT COUNT(1) as count FROM features");
	
	auto startTime = std::chrono::high_resolution_clock::now();
	
	// Go
	Parser parser(featuresCount["count"], 1000, 1000, 4);

	auto endTime = std::chrono::high_resolution_clock::now();
	auto duration_seconds = std::chrono::duration_cast<std::chrono::duration<double>>(endTime - startTime);
	std::cout << "Execution time: " << duration_seconds.count() << " seconds" << std::endl;

	return 0;
}