function drawGraphs() {
	names = [
		{id: "pace", name: "Pace"},
		{id: "elev", name: "Elevation"},
		{id: "gap", name: "GAP"},
		{id: "hr", name: "Heart rate"},
		{id: "temp", name: "Temperature"},
	];
	availableData = getAvailableData();
	addGraphBoxes();
	graphs = addGraphs();
	graphs.forEach(function(g) {defaultZoom(g);});

	setColors(graphs);
	setOptions(graphs);
	sync(graphs);
}


function addGraphs() {
	var graphDivs = Array.from(document.getElementsByClassName("graph-div"));
	var graphs = [];
	graphDivs.forEach(function(graphDiv) {
		// each graph shows two fields
		var field1 = graphDiv.classList[1];
		var field2 = graphDiv.classList[2];
		// create data source for graph
		var data = [];
		for (var i = 0; i < run.points.length; i++) {
			var point = run.points[i];
			var pointArray = [];
			pointArray.push(point.sumDuration);
			pointArray.push(point[field1]);
			pointArray.push(point[field2]);
			data.push(pointArray);
		}
		
		var g = new Dygraph(graphDiv, data, {
			labels: ["Time", getFieldName(field1), getFieldName(field2)],
			legend: "never",
			axes: {
				"x": {drawAxis: false, ticker: timeTicker},
				"y2": {independentTicks: true}
			}
		});
		graphs.push(g);
	});
	return graphs;
}

function setOptions(graphs) {
	graphs[0].plotter_.clear();
	// only show one x axis, between the two graphs
	graphs[0].updateOptions({
		axes: {
			"x": {
				drawAxis: true,
				axisLabelFormatter: formatTime,
			}
		}
	});

	graphs.forEach(function(g) {
		g.plotter_.clear();
		// get field names
		var fields = getGraphFields(g);
		var seriesObj = {};
		seriesObj[getFieldName(fields[1])] = {
			fillGraph: true,
			strokeWidth: 0,
			axis: "y2"
		};
		var axesObj = {};
		if (fields[0] == "pace" || fields[0] == "gap") {
			axesObj["y"] = {axisLabelFormatter: formatTime};
		}
		if (fields[1] == "pace" || fields[1] == "gap") {
			axesObj["y2"] = {axisLabelFormatter: formatTime};
		}

		g.updateOptions({
			animatedZooms: true,
			axes: axesObj,
			series: seriesObj,
			highlightCallback: highlight,
			//unhighlightCallback: unhighlight, // TODO: do I want to unhighlight?
		});
	});
}

function highlight(event, x, points, row, seriesName) {
	if (x == 0) {
		return;
	}
	availableData.forEach(function(field) {
		var fieldLegendDivs = Array.from(document.getElementsByClassName("legend-div " + field));
		fieldLegendDivs.forEach(function(legendDiv) {
			legendDiv.innerHTML = format(getPointByTime(x)[field], field);
		});
	});
}

function defaultZoom(g) {
	var fields = getGraphFields(g);
	if (fields[0] != "pace" && fields[0] != "gap") {
		g.resetZoom();
		return;
	}
	// find optimal value range
	var slowestPaceToShow = 60*10;
	var extremes = g.yAxisExtremes();
	var max = extremes[0][0];
	var min = extremes[0][1];
	if (min > slowestPaceToShow) {
		min = slowestPaceToShow;
	}
	g.updateOptions({
		dateWindow: g.xAxisExtremes(),
		axes: {"y": {valueRange: [min, max]}}
	});
}

function getPointByTime(time) {
	for (var i = 0; i < run.points.length; i++) {
		if (run.points[i].sumDuration == time) {
			return run.points[i];
		}
	}
}

function setColors(graphs) {
	var seriesObj = {};
	seriesObj[getFieldName("pace")] = {color: "blue"};
	seriesObj[getFieldName("elev")] = {color: "gray"};
	seriesObj[getFieldName("gap")] = {color: "green"};
	seriesObj[getFieldName("hr")] = {color: "red"};
	seriesObj[getFieldName("cad")] = {color: "purple"};

	graphs.forEach(function(g) {
		g.updateOptions({
			series: seriesObj
		});
	});
}

function getGraphFields(g) {
	var field1 = getFieldId(g.getOption("labels")[1]);
	var field2 = getFieldId(g.getOption("labels")[2]);
	return [field1, field2];
}

function getAvailableData() {
	var availableData = ["pace"];
	if (run.hasEle) {availableData.push("elev", "gap");}
	if (run.hasHr) {availableData.push("hr");}
	if (run.hasCad) {availableData.push("cad");}
	if (run.hasTemp) {availableData.push("temp");}

	return availableData;
}

function addGraphBoxes() {
	// first graph
	document.getElementById("graphs-container").appendChild(
		createGraphBox(availableData[0], availableData[1])
	);
	// second graph, field repeated
	if (availableData.length == 3) {
		document.getElementById("graphs-container").appendChild(
			createGraphBox(availableData[0], availableData[2])
		);
	}
	// second graph, two new fields
	if (availableData.length > 3) {
		document.getElementById("graphs-container").appendChild(
			createGraphBox(availableData[2], availableData[3])
		);
	}
}

function createGraphBox(field1, field2) {
	var graphBox = document.createElement("div");
	graphBox.classList.add("graph-box", field1, field2);
	
	graphBox.appendChild(createStatsDiv(field1, "left"));

	var graphDiv = document.createElement("div");
	graphDiv.classList.add("graph-div", field1, field2);
	graphBox.appendChild(graphDiv);

	graphBox.appendChild(createStatsDiv(field2, "right"));

	return graphBox;
}

function createStatsDiv(field, side) {
	var statsDiv = document.createElement("div");
	statsDiv.classList.add("stats-div", side);

	var graphName = document.createElement("b");
	graphName.innerHTML = getFieldName(field);
	statsDiv.appendChild(graphName);

	var legendDiv = document.createElement("p");
	legendDiv.classList.add("legend-div", field);
	statsDiv.appendChild(legendDiv);
	
	var avgText = document.createElement("p");
	avgText.innerHTML = "Avg:";
	statsDiv.appendChild(avgText);
	
	var avgValue = document.createElement("p");
	avgValue.innerHTML = "todo";
	avgValue.classList.add("avg", field);
	statsDiv.appendChild(avgValue);

	return statsDiv;
}

function sync(graphs) {
	var sync = Dygraph.synchronize(graphs, {
		selection: true,
		zoom: true,
		range: false
	});
}

/*
	//animatedZooms: true, // cannot determine if graph is zoomed
	xRangePad: 0,
	yRangePad: 0.5,
	rollPeriod: 2,
	showRoller: true,
*/
