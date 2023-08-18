pub static OLD_REPO_ABI: &str = r#"{
	"ABI version": 2,
	"version": "2.3",
	"header": ["pubkey", "time", "expire"],
	"functions": [
		{
			"name": "getSnapshotAddr",
			"inputs": [
				{"name":"branch","type":"string"},
				{"name":"name","type":"string"}
			],
			"outputs": [
				{"name":"value0","type":"address"}
			]
		}
	],
	"data": [
		{"key":1,"name":"_name","type":"string"}
	],
	"events": [
	],
	"fields": [
	]
}
"#;

pub static OLD_SNAP_ABI: &str = r#"{
	"ABI version": 2,
	"version": "2.3",
	"header": ["pubkey", "time", "expire"],
	"functions": [
		{
			"name": "getSnapshot",
			"inputs": [
			],
			"outputs": [
				{"name":"value0","type":"string"},
				{"name":"value1","type":"bytes"},
				{"name":"value2","type":"optional(string)"},
				{"name":"value3","type":"string"},
				{"name":"value4","type":"bytes"},
				{"name":"value5","type":"optional(string)"},
				{"name":"value6","type":"string"},
				{"name":"value7","type":"bool"}
			]
		}
	],
	"data": [
		{"key":1,"name":"_name","type":"string"}
	],
	"events": [
	],
	"fields": [
	]
}
"#;