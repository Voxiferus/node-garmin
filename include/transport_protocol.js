const DLE = 16, EOT = 3;

Number.prototype.crop = function(){
	var val = this.valueOf();
	return val >= 256 ? val-256 : val;
}

Number.prototype.addDLE = function(){
	var val = this.valueOf();
	return val == DLE ? [DLE,DLE] : val;
}

Number.prototype.compOfTwo = function(){
	var val = this.valueOf();
	return val == 0 ? 0 : 256 - val;
}

function generatePacket(id,data){
	console.log("Generating packet id = "+id);
	var output = [id,data.length.addDLE()];
	var chksum = (id + data.length).crop();
	
	data.forEach(function(value){
		output = output.concat(value.addDLE());
		chksum = (chksum + value).crop();
	})
	
	var output = [DLE]
		.concat(output)
		.concat(chksum.compOfTwo().addDLE())
		.concat([DLE,EOT])
		
	return new Buffer(output);
}

function parseData(data){
	function splitPackets(array){
		var output = [], packet = [];
		for(i = 0; i < array.length; i++){
			packet.push(array[i]);
			if(array[i] == EOT && array[i-1] == DLE && array[i-2] != DLE){
				output.push(packet);
				packet=[];
			}
		}
		if(packet.length != 0){throw new Error("Incorrect end of packet")}
		return output;
	}
	
	function parsePacket(packet){
		var output = [], chksum = 0;
		var id = packet[0];
		for (i=0;i<packet.length-1;i++){
			output.push(packet[i]);
			chksum = (chksum + packet[i]).crop()
			if(packet[i] == DLE){
				if(packet[i+1] == DLE){i++}else{throw new Error ("DLE stuff parsing error")}
			}
		}
		if (chksum.compOfTwo() != packet[packet.length-1]){throw new Error ("Incorrect checksum")}
		if (packet[1] != packet.length-3){throw new Error ("Incorrect packet length")}
		return {"id":id, "output":output.slice(2)}
	}
	
	try{
		data = splitPackets(data);
		data = data.map(function(packet){
			if (packet[0] != DLE){throw new Error("Incorrect packet beginning")}
			if (packet[packet.length-1] != EOT || packet[packet.length-2] != DLE){throw new Error("Incorrect packet end")}
			return parsePacket(packet.slice(1,-2));
		})
	}catch(err){
		return false;
	}
	
	return data;
}

module.exports.parseData = parseData
module.exports.generatePacket = generatePacket