var webPage = require('webpage');
var webserver = require('webserver');
var fs = require('fs');
var args = require('system').args;

var jqueryFile = 'lib\\jquery.min.js';
var sieFile = 'lib\\sie18-ef.1.js';
var vmlTempl = 'lib\\convert.html';


var fileIndex = 0;
var path = args[1];
var list = fs.list(path);
var scriptPath = args[0];

if (args.length === 1) {
	console.log("Please pass a path");
} else {
	main();
}

if(scriptPath.indexOf('\\') > -1){
	scriptPath = scriptPath.substr(0, scriptPath.lastIndexOf('\\') + 1);
}
else{
	scriptPath = "";
}

jqueryFile = scriptPath + jqueryFile;
sieFile = scriptPath + sieFile;
vmlTempl = scriptPath + vmlTempl;

//console.log("---- base path : " + scriptPath + " ----")

function main() {
	var server = webserver.create();
	server.listen(9527, function (req, res) {
		res.statusCode = 200;
		var url = req.url;
		var query = url.split('/');
		switch (query[1]) {
			case "jquery":
				res.write(fs.read(jqueryFile));
				break;
			case "sie":
				res.write(fs.read(sieFile));
				break;
			case "svg":
				var urlSvg = url.replace('/svg/', '/');
				res.write(
					fs.read(path + "\\" + urlSvg.substring(urlSvg.indexOf('/') + 1))
						.replace(/<\?xml[^>]*>/g, "")
						.replace(/<!--[^>]*-->/g, "")
						.replace(/<!DOCTYPE[^>]*>/g, "")
						.replace(/id=[^>|\s]*/g, "")
				);
				break;
			case "vml":
				res.write(fs.read(vmlTempl));
				break;
			default:
				res.write(fs.read(vmlTempl));
				break;
		}
		res.close();
	});

	list = list.filter(function(filePath){
		return filePath.indexOf(".svg") > -1
	});

	parseSvg(list[fileIndex]);

}

function parseSvg(fileNameAndPath) {
	var svgPage = webPage.create();
	var svgContent;
	var fileName = fileNameAndPath.substring(fileNameAndPath.lastIndexOf('\\') + 1);

	svgPage.open('http://localhost:9527/svg/' + fileName, function () {
		svgPage.includeJs('http://localhost:9527/jquery', function () {
			svgContent = svgPage.evaluate(function () {
				var $ = window.$;
				var $svg = $('svg');
				var viewbox = $svg.attr("viewBox");
				if(!$svg.attr("width") || !$svg.attr("height")){
					$svg.attr("width", viewbox.split(" ")[2]);
					$svg.attr("height", viewbox.split(" ")[3]);
				}
				return $svg.wrap('<div></div>').parent().html();
			});

			svgPage.close();

			convertToVml(encodeURIComponent(svgContent), fileName);
		});
	});
}


function convertToVml(svgContent, fileName) {
	var vmlPage = webPage.create();
	vmlPage.open('http://localhost:9527/vml', function () {
		var vmlContent = vmlPage.evaluate(function (svgContent) {
			var $ = window.$;
			var $result = $('.result');
			var content = decodeURIComponent(svgContent);
			$result.html('<script type="image/svg+xml">' + content + '</script>');
			window.NAIBU._main();
			return $result.html();
		}, svgContent);


		vmlPage.close();
		fs.write(path + "\\" + fileName.replace(".svg", ".vml"), vmlContent);
		console.log("-> " + fileName);

		fileIndex++;
		if (fileIndex === list.length) {
			console.log("----> All of SVG converting completed");
			phantom.exit();
		} else {
			parseSvg(list[fileIndex]);
		}
	});
}



