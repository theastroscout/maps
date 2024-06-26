#ifndef SURFY_GEOM_HPP
#define SURFY_GEOM_HPP

#include <vector>

namespace Geometry {

	struct Point {
		double x;
		double y;
	};

	struct Info {
		unsigned int vertices = 0;
		double length = 0;
		double area = 0;
	};

	struct Line {
		double length = 0;
		std::vector<Point> coords;
		std::string wkt() const; // Return WKT string
	};

	struct MultiLine {
		unsigned int vertices = 0;
		double length = 0;
		std::vector<Line> lines;
	};

	struct Polygon {
		unsigned int vertices = 0;
		double area = 0;
		double length = 0;
		std::vector<Point> inner;
		std::vector<Point> outer;
		std::string wkt() const; // Return WKT string
	};

	struct MultiPolygon {
		unsigned int vertices = 0;
		double area = 0;
		double length = 0;
		std::vector<Polygon> polygons;
		std::string wkt() const; // Return WKT string
	};

	namespace utils {
		void asd();
	}

	/*

	Calc Distance Between Two Points

	*/

	double distance(const Point& p1, const Point& p2) {
		return std::sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y));
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

	double polygonLength(const std::vector<Point>& coords, const size_t& size) {
		double length = 0;
		// size_t l = coords.size() - 1;
		for (size_t i = 0; i < size; ++i) {
			// std::cout << coords[i].x << std::endl;
			length += distance(coords[i], coords[i+1]);
		}
		return length;
	}

	/*
	
	Calculate Polygon Area
	Gauss's area

	*/

	float polygonArea(const std::vector<Point>& coords, const size_t& size) {
		double area = 0;
		for (int i = 0; i < size; ++i) {
			int j = (i + 1) % size;
			area += coords[i].x * coords[j].y - coords[j].x * coords[i].y;
		}
		return area / 2;
	}

	Info polygonInfo(Polygon& poly) {
		Info info;

		size_t outerSize = poly.outer.size();
		if(outerSize > 0){
			info.vertices += outerSize;
			info.length += polygonLength(poly.outer, outerSize - 1);
			info.area += polygonArea(poly.outer, outerSize);
		}

		size_t innerSize = poly.inner.size();
		if(innerSize > 0){
			info.vertices += innerSize;
			info.length += polygonLength(poly.inner, innerSize - 1);
			info.area += polygonArea(poly.inner, innerSize);
		}

		return info;
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

		Info info = polygonInfo(poly);
		poly.vertices = info.vertices;
		poly.length = info.length;
		poly.area = info.area;

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

			multiPoly.vertices += poly.vertices;
			multiPoly.length += poly.length;
			multiPoly.area += poly.area;

			multiPoly.polygons.push_back(poly);
		}

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



	/*



	Utils



	*/

	/*


	
	Clipping Polygon by Mask
	Sutherland-Hodgman algorithm

	Mask Polygon should be sorted couterclockwise



	*/	

	std::vector<Point> clipper(const std::vector<Point>& input, const std::vector<Point>& mask){

		std::vector<Point> output = input;
		
		for (int i = 0; i < mask.size(); ++i) {
			std::vector<Point> input = output;
			output.clear();
			
			const Point& a = mask[i];
			const Point& b = mask[(i + 1) % mask.size()];

			for (int j = 0; j < input.size(); ++j) {
				const Point& p1 = input[j];
				const Point& p2 = input[(j + 1) % input.size()];

				float p1Side = (a.x - b.x) * (p1.y - a.y) - (a.y - b.y) * (p1.x - a.x);
				float p2Side = (a.x - b.x) * (p2.y - a.y) - (a.y - b.y) * (p2.x - a.x);

				if (p1Side >= 0)
					output.push_back(p1);
				if (p1Side * p2Side < 0) {
					Point intersect;
					intersect.x = (p1.x * p2Side - p2.x * p1Side) / (p2Side - p1Side);
					intersect.y = (p1.y * p2Side - p2.y * p1Side) / (p2Side - p1Side);
					output.push_back(intersect);
				}
			}
		}

		return output;
	}

	Polygon clip(const Polygon& poly, const Polygon& maskSrc) {
		Polygon result;
		std::vector<Point> mask = maskSrc.outer;

		result.outer = clipper(poly.outer, mask);
		
		// Mask inner polygon if exists
		if(poly.inner.size()){
			result.inner = clipper(poly.inner, mask);
		}

		// result.length = polygonLength(result);

		return result;
	}

	/*



	Simplify
	Douglas-Peucker algorithm


	*/

	// Find the point with the maximum distance from the line segment
	double maxDistance(Point p1, Point p2, Point p) {
	    double dx = p2.x - p1.x;
	    double dy = p2.y - p1.y;
	    double dist;

	    if (dx == 0 && dy == 0) {
	        // p1 and p2 are the same point
	        dist = distance(p1, p);
	    } else {
	        double t = ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / (dx * dx + dy * dy);
	        if (t < 0) {
	            // Closest point is p1
	            dist = distance(p, p1);
	        } else if (t > 1) {
	            // Closest point is p2
	            dist = distance(p, p2);
	        } else {
	            // Closest point is on the line segment
	            Point closest;
	            closest.x = p1.x + t * dx;
	            closest.y = p1.y + t * dy;
	            dist = distance(p, closest);
	        }
	    }

	    return dist;
	}

	// Douglas-Peucker simplification algorithm
	void douglasPeucker(std::vector<Point>& points, const double& epsilon, std::vector<Point>& simplified) {
	    // Find the point with the maximum distance
	    double maxDist = 0;
	    int index = 0;
	    int end = points.size();

	    for (int i = 1; i < end - 1; ++i) {
	        double dist = maxDistance(points[0], points[end - 1], points[i]);
	        if (dist > maxDist) {
	            maxDist = dist;
	            index = i;
	        }
	    }

	    // If max distance is greater than epsilon, recursively simplify
	    if (maxDist > epsilon) {
	        std::vector<Point> firstHalf(points.begin(), points.begin() + index + 1);
	        std::vector<Point> secondHalf(points.begin() + index, points.end());
	        std::vector<Point> simplifiedFirstHalf;
	        std::vector<Point> simplifiedSecondHalf;
	        douglasPeucker(firstHalf, epsilon, simplifiedFirstHalf);
	        douglasPeucker(secondHalf, epsilon, simplifiedSecondHalf);

	        // Avoid duplicating the endpoint of the first half and the starting point of the second half
	        simplified.insert(simplified.end(), simplifiedFirstHalf.begin(), simplifiedFirstHalf.end() - 1);
	        simplified.insert(simplified.end(), simplifiedSecondHalf.begin(), simplifiedSecondHalf.end());
	    } else {
	        // Keep the endpoints
	        simplified.push_back(points[0]);
	        simplified.push_back(points[end - 1]);
	    }
	}

	std::vector<Point> simplifyPolygon(std::vector<Point> points, const double& epsilon) {
		std::vector<Point> simplified;

		if (points.size() < 3) {
			simplified = points;
			return simplified;
		}

		bool isClosed = false;
		Point front = points.front();
		Point back = points.back();
		if (front.x == back.x && front.y == back.y) {
			isClosed = true;
			points.pop_back();
		}

		douglasPeucker(points, epsilon, simplified);

		if (isClosed) {
			simplified.push_back(simplified[0]);
		}

		return simplified;
	}

	Polygon simplify(const Polygon& poly, const double& epsilon) {
		
		Polygon result;

		std::cout << "Type of num: " << typeid(poly).name() << std::endl;
		
		result.outer = simplifyPolygon(poly.outer, epsilon);
		if (poly.inner.size()) {
			result.inner = simplifyPolygon(poly.inner, epsilon);
		}

		Info info = polygonInfo(result);
		result.vertices = info.vertices;
		result.length = info.length;
		result.area = info.area;

		return result;
	}


	
}

#include "geom.utils.hpp"

#endif