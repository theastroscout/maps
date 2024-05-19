#ifndef SURFY_HPP
#define SURFY_HPP

#include <mutex>
#include "../json.hpp"

namespace surfy {
	using json = nlohmann::ordered_json;

	struct Point {
		double x,y;
	};

	using Coords = std::vector<Point>;
}

#endif