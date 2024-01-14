const winax = require('winax');
const path = require('path');
const service_control = new winax.Object("CeVIO.Talk.RemoteService2.ServiceControl2V40");
const talker = new winax.Object("CeVIO.Talk.RemoteService2.Talker2V40")
service_control.StartHost(false);

async function getWave(text, character, speed, filename) {
    talker.Speed = 50;
    talker.Volume = 100;
    talker.Tone = 50;
    talker.ToneScale = 50;
    console.log(character)
    talker.Cast = character;
    const wave = await talker.OutputWaveToFile(text, filename);
    return wave;
}

async function getCastList() {
    const castList = await talker.AvailableCasts;
    return castList;
}  

module.exports.getWave = getWave;
module.exports.getCastList = getCastList;