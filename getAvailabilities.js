import moment from 'moment'
import knex from 'knexClient'


export default async function getAvailabilities(date) {

  var currentDate = moment(date);
  var finalDate = currentDate.add(6, 'days');
  let availabilities = new Array();

  await knex('events').select('*').where('kind', 'opening').map(function(row) {
    // permet d'ajout les opening dans availabilities sans doublon
    if (availabilities.includes(row.starts_at) == false) {
      availabilities.push(moment(row.starts_at));
      availabilities.push(moment(row.ends_at));
    }
    // on rajoute les dates qui sont recurrentes
    if (row.weekly_recurring == true) {
      var currentStart = moment(row.starts_at).add(7, 'days');
      var currentEnd = moment(row.ends_at).add(7, 'days');
      while (currentStart.isBefore(finalDate)) {
        availabilities.push(currentStart);
        availabilities.push(currentEnd);
        currentStart = moment(currentStart).add(7, 'days');
        currentEnd = moment(currentEnd).add(7, 'days');
      }

    }

  });
  //on va trier la liste suivant les dates
  availabilities.sort();
  let copy = availabilities;
  await knex('events').select('*').where('kind', 'appointment').map(function(row) {
    var start = moment(row.starts_at);
    var end = moment(row.ends_at);
    for (var i = 0; i < availabilities.length - 1; i++) {
      if (start.isBetween(availabilities[i], availabilities[i + 1])) {
        copy.push(start);
        copy.push(end);
      }
    }

  });

  copy = copy.filter(function(item) {
    return (item.isAfter(moment(date)));
  });

  copy.push(moment(date).format('L'));
  copy.sort();
  copy.push(moment(finalDate).format('L'));

  console.log(copy)

  var jsonObj = [];

  for (var i = 0; i < copy.length; i++) {
    var slot = moment(copy[i]).format('LT');
    if (moment(copy[i]).isSame(moment(date), 'day') ||moment(copy[i]).isSame(moment(finalDate), 'day')  ) {
      slot = '';
    }

    var monObjet = Object.create({}, {
      date: {
        value: moment(copy[i]).format('L'),
        enumerable: true
      },
      slots: {
        value: slot,
        enumerable: true
      },
    });
    jsonObj.push(monObjet);
  }

  var group_to_values = jsonObj.reduce(function(obj, item) {
    obj[item.date] = obj[item.date] || [];
    obj[item.date].push(item.slots);
    return obj;
  }, {});

  var dates = Object.keys(group_to_values).map(function(key) {
    return {
      date: key,
      slots: group_to_values[key]
    };
  });

  JSON.stringify(dates);
  console.log(dates)
  return dates;
}
