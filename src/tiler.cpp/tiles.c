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

#include "include/surfy/sqlite/sqlite.h"
surfy::SQLite db;


// Global Config
json config;

void process(surfy::SQLite& dbT, const int& from, const int& limit) {
	std::string query = "SELECT id, oid, group_layer, `group`, layer, data, ST_AsText(coords) AS coords FROM features LIMIT " + std::to_string(limit) + " OFFSET " + std::to_string(from);

	json result = dbT.find(query);
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

		print("Pool", pool);

		for (int threadID = 0; threadID < numThreads; ++threadID) {
			Bucket bucket = pool[threadID];
			threads.emplace_back([this, bucket, threadID] {
				processor(bucket, threadID, std::ref(progress));
			});
		}

		for (auto& thread : threads) {
			thread.join();
			print("Process finished");
		}

		print("ALL PROCESSes finished");
	}

	void processor(const Bucket& bucket, const int& threadID, std::atomic<int>& progress) {
		surfy::SQLite dbT;
		std::string path = "/storage/maps/tiles/isle-of-dogs/isle-of-dogs.db";
		dbT.connect(path.c_str(), true);

		int start = bucket[0];
		int end = bucket[1];
		int from;
		int limit;

		for (int i = start; i < end; i += chunkSize) {
			from = i;
			int remainingRecords = end - from;
			limit = (from + chunkSize > end) ? (end - from) : chunkSize;
			// print(i, limit);

			process(dbT, from, limit);
		}

		print("Threwad Done #", threadID, from + limit);
	}
};

/*
void printProgress(std::atomic<int>& progress, size_t totalElements) {
	while (progress < totalElements) {
		// std::cout << "Progress: " << (progress * 100 / totalElements) << "%" << << std::endl;
		print("Progress:", std::to_string(progress * 100 / totalElements) + "%", progress, totalElements);
		std::this_thread::sleep_for(std::chrono::seconds(1));
	}

	print("Progress:", std::to_string(progress * 100 / totalElements) + "%", progress, totalElements);
}

void getIt(surfy::SQLite& dbT, const int& from, const int& limit) {
	std::string query = "SELECT id, oid, group_layer, `group`, layer, data, ST_AsText(coords) AS coords FROM features LIMIT " + std::to_string(limit) + " OFFSET " + std::to_string(from);

	json result = dbT.find(query);
	// print(query);
	// print(result.size());
}

void processor(const int& start, const int& end, const int& threadID, std::atomic<int>& progress) {
	
	surfy::SQLite dbT;
	std::string path = "/storage/maps/tiles/isle-of-dogs/isle-of-dogs.db";
	dbT.connect(path.c_str(), true);
	dbT.query("SELECT load_extension('mod_spatialite')");

	// Split the request into chunks of 1000 records
	int chunkSize = 100;
	for (int i = start; i < end; i += chunkSize) {
		int remainingRecords = end - i;
		int currentChunkSize = (i + chunkSize > end) ? (end - i) : chunkSize;

		getIt(dbT, i, currentChunkSize);
		progress += currentChunkSize;
	}

	print("Threwad Done #", threadID);

	
	return;
}
*/


int main() {

	/*

	Config

	*/

	std::string config_name = "isle-of-dogs";

	config = surfy::utils::json::load("../tiler/configs/" + config_name + ".json");
	json filters = surfy::utils::json::load("../tiler/config.json");
	config.update(filters);

	// Initialise DB
	db.connect("/storage/maps/tiles/isle-of-dogs/isle-of-dogs.db", true);
	// db.query("SELECT load_extension('mod_spatialite')");

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
	surfy::utils::json::save(configPath, tilesDict);


	json featuresCount = db.findOne("SELECT COUNT(1) as count FROM features");
	
	Parser parser(featuresCount["count"], 1000, 10, 4);
	/*
	int totalRecords = (int) featuresCount["count"];
	int numThreads = 4;
	int chunk = 1000;

	print("Total:", totalRecords);*/
	/*
	Pool pool;
	for (int i = 0; i < totalRecords; i += chunk) {
		int start = i;
		int end = std::min(i + chunk, totalRecords);

		Bucket bucket = {start, end};
		pool.push_back(bucket);
		print("Bucket", bucket);
	}

	run();*/

	return 0;
}

/*
	auto startTime = std::chrono::high_resolution_clock::now();

	unsigned int maxThreads = std::thread::hardware_concurrency();
	std::vector<std::thread> threads;
	std::atomic<int> progress(0);

	json featuresCount = db.findOne("SELECT COUNT(1) as count FROM features");
	int totalRecords = featuresCount["count"];
	int numThreads = 4;
	int recordsPerThread = totalRecords / numThreads;

	int start;
	int end;
	std::vector<std::vector<int>> pool;

	for (int i = 0; i < numThreads; ++i) {
		start = i * recordsPerThread;
		end = (i + 1) * recordsPerThread - 0;
		if (i == numThreads - 1 ){
			end = totalRecords;
		}

		std::vector<int> poolItem = {start, end};
		pool.push_back(poolItem);
		print("Bucket", poolItem);
		threads.emplace_back(processor, pool[i][0], pool[i][1], i, std::ref(progress));

	}

	// Progress
	std::thread progressThread(printProgress, std::ref(progress), totalRecords);

	// Wait for all threads to finish
	progressThread.join();
	for (auto& thread : threads) {
		thread.join();
	}

	auto endTime = std::chrono::high_resolution_clock::now();
	auto duration_seconds = std::chrono::duration_cast<std::chrono::duration<double>>(endTime - startTime);
	std::cout << "Execution time: " << duration_seconds.count() << " seconds" << std::endl;

	return 0;
*/