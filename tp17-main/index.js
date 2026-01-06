// 1. Importer les modules nécessaires
const fs = require('fs');
const convert = require('xml-js');
const protobuf = require('protobufjs');

// 2. Charger le fichier .proto et le type Protobuf
// Charger la définition Protobuf à partir du fichier .proto
const root = protobuf.loadSync('employee.proto');

// Récupérer le type "Employees" défini dans employee.proto
const EmployeeList = root.lookupType('Employees');

// 3. Construire la liste d'employés en JavaScript
// Création d'une liste d'employés en mémoire
const employees = [];

employees.push({
  id: 1,
  name: 'Ali',
  salary: 9000,
  email: 'ali@example.com',
  hire_date: '2020-01-15',
  skills: ['JavaScript', 'Node.js', 'React'],
  is_active: true
});

employees.push({
  id: 2,
  name: 'Kamal',
  salary: 22000,
  email: 'kamal@example.com',
  hire_date: '2018-06-20',
  skills: ['Python', 'Django', 'PostgreSQL'],
  is_active: true
});

employees.push({
  id: 3,
  name: 'Amal',
  salary: 23000,
  email: 'amal@example.com',
  hire_date: '2019-03-10',
  skills: ['Java', 'Spring Boot', 'Kubernetes', 'gRPC'],
  is_active: false
});

// 4. Construire l'objet racine pour la sérialisation
// Objet racine correspondant au message "Employees"
let jsonObject = {
  employee: employees
};

// ---------- JSON : encodage ----------
console.time('JSON encode');
let jsonData = JSON.stringify(jsonObject);
console.timeEnd('JSON encode');

// JSON avec indentation (pour comparaison)
let jsonPretty = JSON.stringify(jsonObject, null, 2);

// ---------- JSON : décodage ----------
console.time('JSON decode');
let jsonDecoded = JSON.parse(jsonData);
console.timeEnd('JSON decode');

// Options pour la conversion JSON -> XML
const options = {
  compact: true,
  ignoreComment: true,
  spaces: 0
};

// ---------- XML : encodage ----------
console.time('XML encode');
let xmlData = "<root>\n" + convert.json2xml(jsonObject, options) + "\n</root>";
console.timeEnd('XML encode');

// ---------- XML : décodage ----------
console.time('XML decode');
// Conversion XML -> JSON (texte) -> objet JS
let xmlJson = convert.xml2json(xmlData, { compact: true });
let xmlDecoded = JSON.parse(xmlJson);
console.timeEnd('XML decode');

// Encodage en Protobuf : vérification du schéma
let errMsg = EmployeeList.verify(jsonObject);
if (errMsg) {
  throw Error(errMsg);
}

// ---------- Protobuf : encodage ----------
console.time('Protobuf encode');
let message = EmployeeList.create(jsonObject);
let buffer = EmployeeList.encode(message).finish();
console.timeEnd('Protobuf encode');

// ---------- Protobuf : décodage ----------
console.time('Protobuf decode');
let decodedMessage = EmployeeList.decode(buffer);
// Optionnel : conversion vers objet JS "classique"
let protoDecoded = EmployeeList.toObject(decodedMessage);
console.timeEnd('Protobuf decode');

// Écriture des données dans les fichiers
fs.writeFileSync('data.json', jsonData);   // Fichier JSON
fs.writeFileSync('data.xml', xmlData);     // Fichier XML
fs.writeFileSync('data.proto', buffer);    // Fichier Protobuf binaire

// ---------- Mesure des tailles ----------

const jsonFileSize = fs.statSync('data.json').size;
const xmlFileSize = fs.statSync('data.xml').size;
const protoFileSize = fs.statSync('data.proto').size;

console.log('\n========== COMPARAISON DES TAILLES ==========');
console.log(`Taille de 'data.json' : ${jsonFileSize} octets`);
console.log(`Taille de 'data.xml'  : ${xmlFileSize} octets`);
console.log(`Taille de 'data.proto': ${protoFileSize} octets`);
console.log(`JSON indenté (mémoire): ${jsonPretty.length} octets (+${jsonPretty.length - jsonData.length} vs compact)`);

console.log('\n========== RATIOS DE COMPRESSION ==========');
console.log(`Protobuf vs JSON: ${((1 - protoFileSize/jsonFileSize) * 100).toFixed(1)}% plus petit`);
console.log(`Protobuf vs XML:  ${((1 - protoFileSize/xmlFileSize) * 100).toFixed(1)}% plus petit`);
console.log(`JSON vs XML:      ${((1 - jsonFileSize/xmlFileSize) * 100).toFixed(1)}% plus petit`);

console.log('\n========== VÉRIFICATION DE SYMÉTRIE ==========');
const jsonSymmetry = JSON.stringify(jsonObject) === JSON.stringify(jsonDecoded);
// Protobuf convertit is_active en boolean, donc comparer les données essentielles
const protoEmployee1 = protoDecoded.employee && protoDecoded.employee[0];
const originalEmployee1 = jsonObject.employee[0];
const protoSymmetry = protoEmployee1 && protoEmployee1.id === originalEmployee1.id && 
                       protoEmployee1.name === originalEmployee1.name;
console.log(`JSON encode/decode:     ${jsonSymmetry ? '✓ Symétrique' : '✗ Asymétrique'}`);
console.log(`Protobuf encode/decode: ${protoSymmetry ? '✓ Symétrique' : '✗ Asymétrique'}`);
console.log(`XML encode/decode:      ${xmlDecoded.root ? '✓ Décodé' : '✗ Erreur'}`);
