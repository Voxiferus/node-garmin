var serialport = require("serialport");
var SerialPort = serialport.SerialPort;
var Parser = require('binary-parser').Parser;

var parseData = require('./include/transport_protocol.js').parseData;
var generatePacket = require('./include/transport_protocol.js').generatePacket;

const ACK = 6, NAK = 21;
const Pid_Command_Data = 10;
const Cmnd_Transfer_Wpt = 7;
const Pid_Product_Rqst = 254;

var serial_port = new SerialPort("COM4", {
  baudrate: 9600,
  parser: serialport.parsers.raw
});

function sendACK(id){
	console.log("Sending ACK id = "+id);
	serial_port.write(generatePacket(ACK,[id]));
}

function sendNAK(id){
	serial_port.write(generatePacket(NAK,[id]));
}

function Request(){
}

Request.prototype.set = function(id,data){
	this.id = id;
	this.data = data;
	return this;
}

Request.prototype.send = function(){
	if(typeof this.id !== 'number' || typeof this.data !== 'object'){
		throw new Error("Incorrect request");
	}
	var request = generatePacket(this.id,this.data);
	console.log("Sending request id = "+this.id);
	serial_port.write(request);
}

mathFunctions={
	"semicToDeg":function(semic){
		return semic*(180/Math.pow(2,31))
	}
}

garminParsers={
	"D100_Wpt_Type" : new Parser()
		.uint8("wpt_class")
		.uint8("color")
		.uint8("dspl")
		.uint8("attr")
		.uint16("smbl")
		.array('subclas', {
			type: 'uint8',
			length: 18
		})
		.int32le("lat",{
			formatter: function(semic){return mathFunctions.semicToDeg(semic)}
		})	
		.int32le("lon",{
			formatter: function(semic){return mathFunctions.semicToDeg(semic)}
		})
		.floatle("alt")
		.floatle("dpth")	
		.floatle("dist")
		.string('state', {
			encoding: 'ascii',
			length: 2
		})	
		.string('cc', {
			encoding: 'ascii',
			length: 2
		})		
		.string("ident",
			{"zeroTerminated":true,
			"encoding":"ascii"
		})	
}

serial_port.on("open", function () {
	console.log('Port opened');
	
	var request = new Request();
	request.set(Pid_Command_Data,[Cmnd_Transfer_Wpt,0]).send();
	
	//requiestId = Pid_Product_Rqst;
	//requestData = [];
	
	serial_port.on('data', function(data) {
		var responce = parseData(data);
		
		if(responce == false){
			sendNAK(0);
		}else{
			responce.forEach(function(responce_item){
				var id = responce_item.id;
				var output = responce_item.output;
				
				if(id == NAK){
					request.send();
				}
				else if(id != ACK){
					sendACK(id);
					var buffer = new Buffer(output);				
					if(responce_item.id == 35){
						var wpt = garminParsers.D100_Wpt_Type.parse(buffer);
						console.log(wpt);
					}
				}
			});
		}
	});
})