#ifndef SURFY_GEOM_UTILS_HPP
#define SURFY_GEOM_UTILS_HPP
#pragma once
#include "geom.hpp"

namespace Geometry::utils {

		/*

		Calc Distance Between Two Points

		*/

		double distance(const Point& p1, const Point& p2) {
			return std::sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y));
		}
	}
}

#endif