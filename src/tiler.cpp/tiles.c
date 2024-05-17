#include <chrono>
#include <thread>
#include <atomic>

#include <iostream>
#include <fstream>
#include <vector>

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


// Global Config
json config;
std::array<int, 10> zoomLevels = { 2, 4, 6, 8, 10, 12, 14, 15, 16, 17 };
std::vector<json> layersConfig = {
	{
		{ "name", "undefined" }
	}
};

struct Row {
	int oid;
	int geomType;
	int layerID;
	std::string data;
	std::string coords;

	std::string toString() {
		return std::to_string(oid) + "\t" +
			   std::to_string(geomType) + "\t" +
			   std::to_string(layerID) + "\t" +
			   data + "\t" +
			   coords;
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

void featureHandler(const json& feature) {

	/*

	For any polygon min Simplifier is .00001

	*/

	sg::Shape shape(feature["coords"], true);
	const json& layerConfig = layersConfig[feature["layer_idx"]];

	std::vector<double> westSouth;
	std::vector<double> eastNorth;

	print(feature);
	print("Shaped Feature", shape);

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
						print(zoom, x, y, clip);
						
						sg::Shape newShape = shape;

						if (clip) {
							sg::Coords mask = surfy::geo::tileBBox(zoom, x, y);
							newShape.clip(mask);
						}

						/*

						Compressor

						*/						

						if (layerConfig.contains("compress") && layerConfig["compress"].contains(zoomStr)) {
							const json& compressor = layerConfig["compress"][zoomStr];

							if (compressor.contains("simplify")) {
								newShape.simplify(compressor["simplify"]);
							}

							if (compressor.contains("drop") && shape.area < compressor["drop"]) {
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
						print("\n\n");
						print(line.toString());
						print("\n\n");
					}
				}
			}
		}
	}

	exit(1);
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
		std::string path = "/storage/maps/tiles/isle-of-dogs.v2/isle-of-dogs.play.db";
		dbT.connect(path.c_str(), true);
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

				std::string query = "SELECT id, oid, group_layer, layer_idx, `group`, layer, data, coords, bounds FROM features_norm LIMIT " + std::to_string(limit) + " OFFSET " + std::to_string(from);
				dbT.find(query, {}, featureHandler);
			}

			// print("Thread Done #" + std::to_string(threadID), from + limit);
		}
	}
};


int main() {

	// sg::Shape poly("POLYGON ((-.00002 -.00002, .00000 .000010, .000010 .000010, .000010 .00000, -.00002 -.00002),(.00000 .00000, .00000 .00005, .00005 .00005, .00005 .00000, .00000 .00000))");
	// sg::Shape mask("POLYGON ((-.00003 -.00003, .00000 .00006, .00006 .00006, .00006 .00000, -.00003 -.00003))");
	/*
	sg::Shape poly("POLYGON((-0.03064 51.511674, -0.030637 51.511662, -0.030627 51.511651, -0.030612 51.511643, -0.0306 51.511639, -0.030587 51.511637, -0.030585 51.511563, -0.029978 51.511567, -0.029979 51.511603, -0.029979 51.511618, -0.029954 51.511618, -0.029956 51.511736, -0.029982 51.511735, -0.029982 51.511751, -0.029983 51.51179, -0.030527 51.511786, -0.030589 51.511786, -0.030588 51.511711, -0.030604 51.511708, -0.030618 51.511703, -0.03063 51.511695, -0.030638 51.511685, -0.03064 51.511674))");
	sg::Shape mask("POLYGON((-0.032958984 51.510452, -0.030212402 51.510452, -0.030212402 51.512161, -0.032958984 51.512161))");
	print("\nMask: ", mask.geom.polygon.outer.coords);
	print("\nSrc Poly: ", poly);
	poly.clip(mask.geom.polygon.outer.coords);
	print("\nClipped: ", poly);

	exit(0);
	*/

	/*

	Config

	*/

	std::string config_name = "isle-of-dogs";

	config = surfy::utils::json::load("../tiler/configs/" + config_name + ".json");
	json filters = surfy::utils::json::load("../tiler/config.json");
	config.update(filters);

	// Initialise DB
	db.connect("/storage/maps/tiles/isle-of-dogs.v2/isle-of-dogs.play.db", true);

	// Just...
	print("Config Name: ", config["name"]);

	std::string configPath = config["data"];
	configPath += "/config.json";
	print("Config Path: " + configPath);

	json tilesConfig = json::array({ { "name", "undefined" } });

	int layerID = 0;
	for (auto& [groupName, groupData] : config["groups"].items()) {

		for (auto& [layerName, layerData] : groupData.items()) {	

			json layerConfig = {
				{ "id", layerID },
				{ "group", groupName },
				{ "layer", layerName },
				{ "minzoom", layerData["minzoom"] },
				{ "data", layerData["data"] },
				{ "compress", layerData["compress"] }
			};

			layersConfig.push_back(layerConfig);

			tilesConfig.push_back({
				{ "group", groupName },
				{ "layer", layerName },
				{ "data", layerData["data"] }
			});

			layerID++;
		}
	}

	

	// Save Tiles Confgi to file
	surfy::utils::json::save(configPath, tilesConfig);

	json bboxData = db.findOne("SELECT data FROM config WHERE name='bbox'");
	json bbox = bboxData["data"];
	print("BBox: ", bbox);


	std::string query = "SELECT id, oid, group_layer, layer_idx, `group`, layer, data, coords, bounds FROM features_norm WHERE layer='houses' LIMIT 1";
	json result = db.findOne(query);
	if (result["_status"] == true) {
		featureHandler(result);
	}

	return 1;

	json featuresCount = db.findOne("SELECT COUNT(1) as count FROM features");
	
	auto startTime = std::chrono::high_resolution_clock::now();
	
	// Go
	Parser parser(featuresCount["count"], 1000, 1000, 4);

	auto endTime = std::chrono::high_resolution_clock::now();
	auto duration_seconds = std::chrono::duration_cast<std::chrono::duration<double>>(endTime - startTime);
	std::cout << "Execution time: " << duration_seconds.count() << " seconds" << std::endl;

	return 0;
}