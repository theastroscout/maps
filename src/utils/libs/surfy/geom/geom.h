#ifndef GEOM_HPP
#define GEOM_HPP
#pragma once
#include <iostream>
#include <string>
#include <vector>

namespace surfy::geom {

	// namespace types {};

	/*
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
		std::vector<Line> items;
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
		std::vector<Polygon> items;
		std::string wkt() const; // Return WKT string
	};
	*/

	namespace utils {};

	void test();
}

#include "types.h"
#include "utils.h"


namespace surfy::geom2 {
	/*
	class Geometry {
	public:
	    virtual ~Geometry() = default;
	};
	*/

	
	struct Geometry {
		int id;
	};

	struct Point : public Geometry {
		std::string type = "Point";
		double x;
		double y;
	};

	struct Line : public Geometry {
		std::string type = "Line";
		std::vector<Point> coords;
	};

	struct Polygon {
		std::string type = "Polygon";
		std::vector<Point> outer;
		std::vector<Point> inner;
	};

	
	class Shape {



	public:
		
		unsigned int vertices = 0;
		double length = 0;
		double area = 0;
		std::string type;
		
		/*union Geometry {
	        Point point;
	        Line line;
	        Geometry() {} // Default constructor to satisfy the union requirements
        	~Geometry() {} // Destructor to ensure proper cleanup
	    } geom;
	    */
	    
	    // template<typename Geom>
	    // Geom geom;

	    /*union {
	        int intValue;
	        float floatValue;
	        double doubleValue;
	    } num;*/
/*
	    union Geometry {
	    	Point point;
	    	Line line;
	    } geom;*//*

	    union Geometry {
	    	Point point;
	    	Line line;
	    	Polygon poly;
	    	Geometry(){}
	    	~Geometry(){}
	    } geom;
	    */



	    
		Shape(const std::string& src) {

	        if (src.find("POINT") != std::string::npos) {
	            type = "Point";
	            
	            // asd = 3;

	            // geom = new Point();
	            // geom.x = 10;
	            // Point point;
	            // geom.point = point;
	            // std::cout << geom.point.x << std::endl;
	            // std::cout << geom.line.x << std::endl;
	           //  Point point;
	            /*
	            new (&geom.point) Point();
	            
	            geom.point.x = 2;
	            geom.line.x = 3;

	            std::cout << geom.point.x << std::endl;
	            std::cout << geom.line.x << std::endl;*/

	            // point.x = 10;
	            // geom.point = point;
	            // new (&geom.point) Point(); // Placement new to initialize the point member
	        } else if (src.find("LINE") != std::string::npos) {
	            type = "Line";
	            // Line line;
	            // geom.line = line;
	            // num.doubleValue = 1.3;
	            // Line line;
	            // geom = line;
	            // new (&geom.line) Line(); // Placement new to initialize the line member
	        } else {
	        	// Line point;
	           //  geom.point = point;
	        }
	    }

	    ~Shape() {

	    	// delete geom;

	    	/*
	        if (type == "Point") {
	            geom.point.~Point(); // Explicitly call the destructor for Point
	        } else if (type == "Line") {
	            geom.line.~Line(); // Explicitly call the destructor for Line
	        }
	        */
	    }
	};
}

void surfy::geom::test() {
	/*Point point;
	point.x = 10;
	point.y = 15;
	surfy::geom::utils::distance(point);
	*/
	std::cout << "Hello from MyClass!" << std::endl;
}

#endif