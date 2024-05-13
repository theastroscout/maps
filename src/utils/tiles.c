/*

sudo apt-get install libboost-all-dev

*/

#include <iostream>
#include <fstream>

#include <array>
#include <sqlite3.h>
#include "include/json.h"
using json = nlohmann::ordered_json;

#include <cmath>
#include <vector>

#include "include/sqlite.h"
surfy::SQLite db;

#include "include/surfy/geom/geom.h"
namespace sg = surfy::geom;

#include "include/print.h"
using surfy::print;


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
	/*
	Polygon mask, original;
	bg::read_wkt("POLYGON((-0.035706 51.4848, -0.032959 51.4848,-0.032959 51.4831,-0.035706 51.4831,-0.035706 51.4848))", mask);
	bg::read_wkt("POLYGON((-0.042242 51.513198, -0.042204 51.513163, -0.032959 51.4848,-0.032959 51.4831, -0.042242 51.513198))", original);

	std::deque<Polygon> clipped_multipolygon;
    bg::intersection(original, mask, clipped_multipolygon);
    for (const Polygon& polygon : clipped_multipolygon) {
    	print("Clipped", bg::wkt(polygon));
    }
    */



	// Get Tile BBox
	std::string boundsBox = getTileBox(tile[0], tile[1], tile[2]);
	print("Tile BBox", boundsBox);
	/*
	Python
	LngLatBbox(west=-0.03570556640625, south=51.4830933498849, east=-0.032958984375, north=51.484803739516046)
	POLYGON ((-0.032958984375 51.4830933498849, -0.032958984375 51.484803739516046, -0.03570556640625 51.484803739516046, -0.03570556640625 51.4830933498849, -0.032958984375 51.4830933498849))
	
	C++

	POLYGON (-0.035706 51.484804, -0.032959 51.484804, -0.032959 51.483093, -0.035706 51.483093, -0.035706 51.484804)

	Tile BBox (-0.032959 51.483093, -0.032959 51.484804, -0.035706 51.484804, -0.035706 51.483093, -0.032959 51.483093)

	*/
	
	std::string placeholders;
	int size = tile[3].size();
	for (int i = 0; i < size; ++i) {
		placeholders += "?,";
	}
	placeholders.erase(placeholders.size() - 1);
	
	std::string query = "SELECT id, oid, group_layer, `group`, layer, data, ST_AsText(coords) AS coords FROM features WHERE group_layer IN ("+placeholders+") and Intersects(coords, ST_GeomFromText(?));";

	std::vector<std::string> params = tile[3];
	params.push_back("POLYGON (" + boundsBox + ")");
	
	// Find all features inside Tile BBox
	json features = db.find(query, params);
	
	

	if (features.empty()) {
		return 0;
	}

	for (const auto& feature : features) {
		// print(feature);
		
		std::string geom = feature["coords"];
		std::string geom_type;
		if (geom.find("POINT") != std::string::npos) {
			geom_type = "Point";
			// Point point;
			// bg::read_wkt(geom, point);
		} else if (geom.find("MULTIPOLYGON") != std::string::npos) {
			geom_type = "MultiPolygon";
			// MultiPolygon multiPolygon;
			// bg::read_wkt(geom, multiPolygon);

			/*
			print("BBox:", bg::wkt(bounds));
			print("Src Geom:", geom);
			double a = bg::area(multiPolygon);
			print("Area:", a);
			*/

			// std::deque<Polygon> clipped;
			// bg::intersection(mask, multiPolygon, clipped);
			/*
			if (clipped.empty()) {
				double a = bg::area(multiPolygon);
				print("Empty");
				print("Src Geom:", geom);
				print("Mask:", boundsBox);
				print("Area", a);
			} else {
				for (const Polygon& polygon : clipped) {
					// Polygon result;
					// bg::intersection(polygon, bounds, result);
					// print("Clipped:", bg::wkt(polygon));
					// print("Clipped:", bg::area(polygon));
				}
			}

			print("\n\n");
			*/

		} else if (geom.find("POLYGON") != std::string::npos) {
			geom_type = "Polygon";
			// Polygon polygon;
			// bg::read_wkt(geom, polygon);

			// bg::model::polygon<Point> result;
			// bg::intersection(polygon, bounds, result);

		} else if (geom.find("LINESTRING") != std::string::npos) {
			geom_type = "LineString";
			// LineString lineString;
			// bg::read_wkt(geom, lineString);
			/*
			print("BBox:", bg::wkt(bounds));
			print("Src Geom:", geom);
			LineString result;
			bg::intersection(bounds, lineString, result);
			std::cout << bg::wkt(result) << "\n\n";
			*/
		} else {
			print("Unknown Geometry Type", geom);
		}
	}

	return 1;
}


int main() {

	// std::cout << std::fixed << std::setprecision(6);

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

	// parseTile(tiles[8]);

	/*
	Geometry::Polygon poly = Geometry::parsePolygon("POLYGON ((-0.035706 51.484804, -0.032959 51.484804))");
	// Print vertices
    std::cout << "Vertices of the polygon:" << std::endl;
    for (const auto& vertex : poly.vertices) {
        std::cout << "(" << vertex.x << ", " << vertex.y << ")" << std::endl;
    }
    */












	/*

    Geometry::Point point = Geometry::parsePoint("POINT (-0.035706 51.484804)");
    std::cout << "Point: " << point << std::endl;

    print("\n\n");

    // Geometry::Polygon poly = Geometry::parsePolygon("POLYGON ((40 40, 20 45, 45 30, 40 40))");
    // {{0, 0}, {1, 1}, {2, 2}, {3, 3}, {4, 4}}
    Geometry::Polygon poly = Geometry::parsePolygon("POLYGON ((0 0, 1 1, 3 3, 4 4, 5 6, 7 15, 3 6, 0 0))");
	std::cout << "Polygon: " << poly << std::endl;
	std::cout << "Polygon Length: " << poly.length << std::endl;

	Geometry::simplify(poly, 2);

	print("\n\n\n\n");

	Geometry::Polygon polyS = Geometry::parsePolygon("POLYGON ((-0.0426899 51.5166536, -0.0426874 51.51564, -0.0415785 51.5156202, -0.0416071 51.5158, -0.0416962 51.5159493, -0.0421352 51.5163716, -0.0425499 51.5166216, -0.0426899 51.5166536))");

	print("SIMPLIFY POLY S");
	print(polyS);
	// Geometry::Polygon simplified = Geometry::simplify(polyS, .00001);
	Geometry::Polygon simplified = Geometry::simplify(polyS, .001);
	print("SIMPLIFIED", simplified);

	print("\n\n\n\n");

    // poly = Geometry::parsePolygon("POLYGON ((40 40, 20 45, 45 30, 40 40),(30 20, 20 15, 20 25, 30 20))");
    poly = Geometry::parsePolygon("POLYGON ((-0.035706 51.484804, -0.032959 51.484804, -0.032959 51.483093, -0.035706 51.483093, -0.035706 51.484804))");
	std::cout << "Polygon Complex: " << poly << std::endl;
	std::cout << "First Point of outer: " << poly.outer[0] << std::endl;

	print("\n\n");

	std::string polygonString = poly.wkt();
	std::cout << "Print Polygon WKT: " << polygonString << std::endl;

	std::cout << "Polygon vertices amount: " << poly.vertices << std::endl;
	std::cout << "Polygon Length: " << poly.length << std::endl;
	std::cout << "Polygon Area: " << poly.area << std::endl;

	print("\n\n");

	Geometry::MultiPolygon multiPoly = Geometry::parseMultiPolygon("MULTIPOLYGON (((40 40, 20 45, 45 30, 40 40),(30 20, 20 15, 20 25, 30 20)),((40 40, 20 45, 45 30, 40 40)),((40 40, 20 45, 45 30, 40 40)))");

	std::cout << "Print MultiPolygon: " << multiPoly << std::endl;
	std::cout << "First Polygon of MultiPolygon: " << multiPoly.items[0] << std::endl;

	std::string multiPolyString = multiPoly.wkt();
	std::cout << "Print MultiPolygon WKT: " << multiPolyString << std::endl;

	print("\n\n");
	std::cout << "MultyPolygon vertices: " << multiPoly.vertices << std::endl;
	std::cout << "MultyPolygon Length: " << multiPoly.length << std::endl;
	std::cout << "MultyPolygon Area: " << multiPoly.area << std::endl;



	print("\n\nCLIPPING\n\n");

	Geometry::Polygon polyA = Geometry::parsePolygon("POLYGON ((0 0, 20 0, 20 20, 0 20, 0 0), (20 20, 0 0, 0 10, 10 20 ))");

	// Geometry::Polygon mask = Geometry::parsePolygon("POLYGON ((0 0, 15 0, 15 15, 0 15, 0 0))");
	Geometry::Polygon mask = Geometry::parsePolygon("POLYGON ((0 0, 0 15, 15 15, 15 0))");

	Geometry::Polygon maskResult = Geometry::clip(polyA, mask);
	print("maskResult", maskResult);

	*/

	sg::Shape mask = sg::Shape("POLYGON ((0 0, 0 15, 15 15, 15 0))");
	print("Mask", mask);
	/*

	Point

	*/

	print("Create Point");
	sg::Shape point = sg::Shape("POINT (-0.035706 51.484804)");
	print("Type:", point.type);
	print("Coords (x,y):", point.geom.point.x, point.geom.point.y);
	std::string pointWKT = point.wkt();
	print(pointWKT, "\n\n");

	/*

	Line

	*/

	print("Create Line");
	sg::Shape line = sg::Shape("LINESTRING (0 0, 10 10, 30 30)");
	print("Type:", line.type);
	print("Closed:", line.geom.line.closed);
	print("Vertices:", line.vertices, line.geom.line.vertices);
	print("Length:", line.length, line.geom.line.length);
	std::string lineWKT = line.wkt();
	print(lineWKT, "\n\n");

	print("Clip Line");
	sg::Shape clippedLine = sg::clip(line, mask);
	print("Clipped Line", clippedLine);


	print("\n\n");

	/*

	Closed Line

	*/

	print("Create Closed Line");
	sg::Shape cLine = sg::Shape("LINESTRING (0 0, 2 2, 3 3, 0 0)");
	print("Type:", cLine.type);
	print("Closed:", cLine.geom.line.closed);
	print("Vertices:", cLine.vertices, cLine.geom.line.vertices);
	print("Length:", cLine.length, cLine.geom.line.length);
	std::string cLineWKT = cLine.wkt();
	print(cLineWKT, "\n\n");

	/*

	MultiLine

	*/

	print("Create MultiLine");
	sg::Shape mLine = sg::Shape("MULTILINESTRING ((0 0, 2 2, 4 4), (0 0, 3 3, 6 6, 9 9))");
	print("Type:", mLine.type);
	print("Vertices:", mLine.vertices, mLine.geom.multiLine.vertices);
	print("Size:", mLine.size, mLine.geom.multiLine.size);
	print("Length:", mLine.length, mLine.geom.multiLine.length);
	std::string mLineWKT = mLine.wkt();
	print(mLineWKT, "\n\n");

	
	sg::Shape polyShape3 = sg::Shape("POLYGON ((-0.035706 53.484804, -0.025706 51.484804, -0.0357 52.484804, -0.035706 53.484804))");
	print("Type 3:", polyShape3.type);
	print("Vertices 3", polyShape3.geom.polygon.vertices);
	print("Area 3", polyShape3.geom.polygon.area);
	std::string polyWKT3 = polyShape3.wkt();
	print(polyWKT3, "\n\n");

	

	sg::Shape polyShape = sg::Shape("POLYGON ((-4.274372 55.858587, -4.273536 55.858584, -4.273530 55.858397, -4.273970 55.858397, -4.273975 55.858190, -4.273627 55.858177, -4.273637 55.858000, -4.274458 55.858009, -4.274426 55.858539, -4.274372 55.858587))");
	print("Type 1:", polyShape.type);
	print("Vertices 1", polyShape.geom.polygon.vertices);
	print("Area 1", polyShape.geom.polygon.area);
	std::string polyWKT = polyShape.wkt();
	print(polyWKT, "\n\n");

	sg::Shape polyShape2 = sg::Shape("POLYGON ((-0.035706 53.484804, -0.025706 51.484804, -0.0357 52.484804, -0.035706 53.484804))");
	print("Type 2:", polyShape2.type);
	print("Vertices 2", polyShape2.geom.polygon.vertices);
	print("Area 2", polyShape2.geom.polygon.area);
	std::string polyWKT2 = polyShape2.wkt();
	print(polyWKT2, "\n\n");


	sg::Shape polyA = sg::Shape("POLYGON ((0 0, 20 0, 20 20, 0 20, 0 0), (20 20, 0 0, 0 10, 10 20 ))");
	print("Polygon Src", polyA);
	print("Mask Src", mask);
	sg::Shape clipped = sg::clip(polyA, mask);
	print("Clipped", clipped);
	return 0;
}