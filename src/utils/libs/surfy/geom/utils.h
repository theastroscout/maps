#ifndef GEOM_UTILS_HPP
#define GEOM_UTILS_HPP
// #pragma once
// #include "main.h"

namespace surfy::geom::utils {
	
	/*

	Calc Distance Between Two Points

	*/

	double distance(const Point& p1, const Point& p2) {
		return std::sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y));
	}

	/*

	Parse Coordinates String

	*/

	std::vector<Point> parseCoordsString(const std::string& str) {
		std::vector<Point> coords;
		// Use stringstream to parse coordinates
		std::stringstream ss(str);
		double x, y;
		char comma;

		while (ss >> x >> y) {
			Point p;
			p.x = x;
			p.y = y;
			coords.push_back(p);
			// Check for comma, if not found, break the loop
			if (!(ss >> comma)) {
				break;
			}
		}

		return coords;
	}

	/*

	Print Coordinates

	*/

	void printPoint(std::ostream& os, const Point& point) {
		os << point.x << " " << point.y;
	}

	void printCoords(std::ostream& os, const std::vector<Point>& coords) {
		os << "(";
		size_t length = coords.size();
		for (size_t i = 0; i < length; ++i) {
			printPoint(os, coords[i]);
			if (i != length - 1) {
				os << ", ";
			}
		}
		os << ")";
	}

	/*

	Polygon Length

	*/

	double polygonLength(const std::vector<Point>& coords, const size_t& size) {
		double length = 0;
		for (size_t i = 0; i < size; ++i) {
			std::cout << "i:" << i << " >>>> " << coords[i].x << "," << coords[i].y  << " >>>> " << coords[i+1].x << "," << coords[i+1].y << std::endl;
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

	/*

	Refresh Polygon Info

	*/

	void refreshPolygon(Polygon& poly) {

		size_t outerSize = poly.outer.size();
		if(outerSize > 0){
			poly.vertices += outerSize;
			std::cout << "LENGTH: " << polygonLength(poly.outer, outerSize - 1) << std::endl;
			// poly.length += polygonLength(poly.outer, outerSize - 1);
			// poly.area += polygonArea(poly.outer, outerSize);
		}

		size_t innerSize = poly.inner.size();
		if(innerSize > 0){
			poly.vertices += innerSize;
			// poly.length += polygonLength(poly.inner, innerSize - 1);
			// poly.area += polygonArea(poly.inner, innerSize);
		}

		// std::cout << poly.length << std::endl;
	}
}

#endif