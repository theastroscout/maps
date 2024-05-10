#ifndef SURFY_GEOM_HPP
#define SURFY_GEOM_HPP

#include <vector>

namespace Geometry {

	struct Point {
		double x;
		double y;
	};

	struct Line {
		Point start;
		Point end;
	};

	using MultiLine = std::vector<Line>;

	struct Polygon {
		std::vector<Point> inner;
		std::vector<Point> outer;
	};

	using MultiPolygon = std::vector<Polygon>;

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
			size_t startPoly = body.find("(", pos);
			size_t endPoly = body.find(")", startPoly);
			if (startPoly == std::string::npos || endPoly == std::string::npos) {
				break; // No more polygons found
			}

			std::string polyStr = body.substr(startPoly + 1, endPoly - startPoly - 1);
			pos = endPoly + 1;

			std::vector<Point> coords = parseCoordsString(polyStr);
			if (pass == 1) {
				std::cout << "Outer: " << polyStr << std::endl;
				poly.outer = coords;
			} else {
				std::cout << "Inner: " << polyStr << std::endl;
				poly.inner = coords;
			}

			pass++;
		}

		return poly;
	}

	// Print Polygon

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

	std::ostream& operator<<(std::ostream& os, const Polygon& poly) {
		os << "POLYGON (";

		printCoords(os, poly.outer);

		if(poly.inner.size()){
			os << ",";
			printCoords(os, poly.inner);
		}

		os << ")";
		return os;
	}








	Polygon parsePolygonStringBody(const std::string& str) {
		Polygon poly;
		// Use stringstream to parse coordinates
		std::stringstream ss(str);
		double x, y;
		char comma;

		while (ss >> x >> y) {
			poly.inner.push_back({x, y});
			// Check for comma, if not found, break the loop
			if (!(ss >> comma)) {
				break;
			}
		}

		return poly;
	}

	// Print Polygon
	/*
	std::ostream& operator<<(std::ostream& os, const Polygon& poly) {
		os << "POLYGON (";
		for (size_t i = 0; i < poly.inner.size(); ++i) {
			os << poly.inner[i].x << " " << poly.inner[i].y;
			if (i != poly.inner.size() - 1) {
				os << ", ";
			}
		}
		os << ")";
		return os;
	}
	*/

	/*

	Multi Polygon

	*/

	MultiPolygon parseMultiPolygon(const std::string& str) {
		MultiPolygon multiPoly;

		/*

		Extract Body

		*/

		size_t startPos = str.find("(");
		size_t endPos = str.rfind(")");

		if (startPos == std::string::npos || endPos == std::string::npos) {
			return multiPoly; // Return an empty vector if parentheses are missing
		}

		std::string body = str.substr(startPos + 1, endPos - startPos - 1);

		size_t pos = 0;
		while (pos < body.size()) {
			size_t startPoly = body.find("((", pos);
			size_t endPoly = body.find("))", startPoly);
			if (startPoly == std::string::npos || endPoly == std::string::npos) {
				break; // No more polygons found
			}

			std::string polyStr = body.substr(startPoly + 2, endPoly - startPoly + 0);
			pos = endPoly + 1;

			Polygon poly = parsePolygonStringBody(polyStr);
			multiPoly.push_back(poly);
		}

		return multiPoly;
	}

	std::ostream& operator<<(std::ostream& os, const MultiPolygon& multiPoly) {
		os << "MULTIPOLYGON (";
		for (size_t i = 0; i < multiPoly.size(); ++i) {
			os << "((";
			for (size_t j = 0; j < multiPoly[i].inner.size(); ++j) {
				os << multiPoly[i].inner[j].x << " " << multiPoly[i].inner[j].y;
				if (j != multiPoly[i].inner.size() - 1) {
					os << ", ";
				}
			}
			os << "))";
			if (i != multiPoly.size() - 1) {
				os << ",";
			}
		}
		os << ")";
		return os;
	}
}

#endif