#ifndef SURFY_GEOM_HPP
#define SURFY_GEOM_HPP

#include <vector>

namespace Geometry {

	struct Point {
		double x;
		double y;
	};

	struct Line {
		double length = 0;
		std::vector<Point> coords;
		std::string wkt() const; // Return WKT string
	};

	struct MultiLine {
		double length = 0;
		std::vector<Line> lines;
	};

	struct Polygon {
		double area = 0;
		double length = 0;
		std::vector<Point> inner;
		std::vector<Point> outer;
		std::string wkt() const; // Return WKT string
	};

	struct MultiPolygon {
		double area = 0;
		double length = 0;
		std::vector<Polygon> polygons;
		std::string wkt() const; // Return WKT string
	};

	/*

	Calc Distance Between Two Points

	*/

	double distance(const Point& a, const Point& b) {
		double dx = b.x - a.x;
		double dy = b.y - a.y;
		return sqrt(dx * dx + dy * dy);
	}

	// Parse Coordinates String
	std::vector<Point> parseCoordsString(const std::string& str) {
		std::vector<Point> coords;
		// Use stringstream to parse coordinates
		std::stringstream ss(str);
		double x, y;
		char comma;

		while (ss >> x >> y) {
			coords.push_back({x, y});
			// Check for comma, if not found, break the loop
			if (!(ss >> comma)) {
				break;
			}
		}

		return coords;
	}

	// Print Coordinates
	void printCoords(std::ostream& os, const std::vector<Point>& coords) {
		os << "(";
		size_t length = coords.size();
		for (size_t i = 0; i < length; ++i) {
			os << coords[i].x << " " << coords[i].y;
			if (i != length - 1) {
				os << ", ";
			}
		}
		os << ")";
	}


	/*

	Point

	*/

	// Convert String to Point

	Point parsePoint(const std::string& str) {
		Point point;
		
		// Find the start and end positions of the coordinates substring
		size_t startPos = str.find("(");
		size_t endPos = str.find(")");

		if (startPos == std::string::npos || endPos == std::string::npos) {
			return point; // Return an empty point if parentheses are missing
		}

		std::string coordsStr = str.substr(startPos + 1, endPos - startPos - 1);
		std::vector<Point> coords = parseCoordsString(coordsStr);
		point = coords[0];

		return point;
	}

	// Print Point

	std::ostream& operator<<(std::ostream& os, const Point& point) {
		os << "(" << point.x << ", " << point.y << ")";
		return os;
	}

	/*

	Polygon

	*/

	double polygonSegmentLength(const std::vector<Point>& coords) {
		double length = 0;
		size_t l = coords.size() - 1;
		for (size_t i = 0; i < l; ++i) {
			// std::cout << coords[i].x << std::endl;
			length += distance(coords[i], coords[i+1]);
		}
		return length;
	}

	double polygonDistance(Polygon& poly) {
		double length = polygonSegmentLength(poly.outer);

		if(poly.inner.size()){
			length += polygonSegmentLength(poly.inner);
		}

		return length;
	}

	// Convert String to Polygon

	Polygon parsePolygon(const std::string& str) {
		Polygon poly;

		size_t startPos = str.find("(");
		size_t endPos = str.rfind(")");

		if (startPos == std::string::npos || endPos == std::string::npos) {
			return poly; // Return an empty polygon if parentheses are missing
		}

		std::string body = str.substr(startPos + 1, endPos - startPos - 1);

		int pass = 1;
		size_t pos = 0;
		while (pos < body.size()) {
			size_t start = body.find("(", pos);
			size_t end = body.find(")", start);
			if (start == std::string::npos || end == std::string::npos) {
				break; // No more polygons found
			}

			std::string polyStr = body.substr(start + 1, end - start - 1);
			pos = end + 1;

			std::vector<Point> coords = parseCoordsString(polyStr);
			if (pass == 1) {
				poly.outer = coords;
			} else {
				poly.inner = coords;
			}

			pass++;
		}

		poly.length = polygonDistance(poly);

		return poly;
	}

	void printPolygonBody(std::ostream& os, const Polygon& poly) {
		os << "(";

		printCoords(os, poly.outer);

		if(poly.inner.size()){
			os << ",";
			printCoords(os, poly.inner);
		}

		os << ")";
	}

	void printPolygon(std::ostream& os, const Polygon& poly) {
		os << "POLYGON ";
		printPolygonBody(os, poly);
	}

	// Print Polygon
	std::ostream& operator<<(std::ostream& os, const Polygon& poly) {
		printPolygon(os, poly);
		return os;
	}

	std::string Polygon::wkt() const {
		std::stringstream os;
		printPolygon(os, *this);
		return os.str();
	}

	/*

	MultyPolygon

	*/

	MultiPolygon parseMultiPolygon(const std::string& str) {
		MultiPolygon multiPoly;

		size_t startPos = str.find("(");
		size_t endPos = str.rfind(")");

		if (startPos == std::string::npos || endPos == std::string::npos) {
			return multiPoly; // Return an empty vector if parentheses are missing
		}

		// Get Main Body
		std::string body = str.substr(startPos + 1, endPos - startPos - 1);

		// Extract Polygons
		size_t pos = 0;
		while (pos < body.size()) {
			size_t start = body.find("((", pos);
			size_t end = body.find("))", start);
			if (start == std::string::npos || end == std::string::npos) {
				break; // No more polygons found
			}

			std::string polyStr = body.substr(start + 0, end - start + 2);
			pos = end + 1;

			// Parse Polygon String
			Polygon poly = parsePolygon(polyStr);

			multiPoly.length += poly.length;

			multiPoly.polygons.push_back(poly);
		}

		multiPoly.area = 2.546;
		return multiPoly;
	}

	// MultiPolygon Printer
	void printMultiPolygon(std::ostream& os, const MultiPolygon& multiPoly) {
		os << "MULTIPOLYGON (";

		size_t length = multiPoly.polygons.size();
		for (size_t i = 0; i < length; ++i) {
			printPolygonBody(os, multiPoly.polygons[i]);
			if (i != length - 1) {
				os << ",";
			}
		}

		os << ")";
	}

	// Print Multi Polygon
	std::ostream& operator<<(std::ostream& os, const MultiPolygon& multiPoly) {
		printMultiPolygon(os, multiPoly);
		return os;
	}

	// Convert MultiPolygon to WKT string
	std::string MultiPolygon::wkt() const {
		std::stringstream os;
		printMultiPolygon(os, *this);
		return os.str();
	}
}

#endif