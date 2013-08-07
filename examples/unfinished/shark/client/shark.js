Meteor.startup(function () {
  /*
  Meteor.setTimeout(function () {
    Items.insert({ text: 'Qux' });
    Items.remove({ text: 'Foo' });
    Items.update({ text: 'Bar' }, { text: 'Coke' });
  }, 1000);
   */
});

UI.body.name = 'World';

UI.body.items = Items.find({}, { sort: { rank: 1 }});


// XXX this is a Minimal Viable Implementation. Improve:
//
// - Strings rather than floating point numbers (making sure not to
// - add an additional bit on every bisection)
//
// - Add some randomization so that if two people reorder into the
//   same position you don't end up with the same rank. (Elements with
//   the same rank can't have anything placed in between)
//
// - At least prepare the ground for occasional rebalancing, in case
// - ranks get too long.
Ranks = {
  beforeFirst: function (firstRank) {
    return firstRank - 1;
  },
  between: function (beforeRank, afterRank) {
    return (beforeRank + afterRank) / 2;
  },
  afterLast: function (lastRank) {
    return lastRank + 1;
  }
};

var randomRank = function () {
  var first = Items.findOne({}, {sort: {rank: 1}});
  var last = Items.findOne({}, {sort: {rank: -1}});
  var newRank;
  if (first && last)
    return first.rank-1 + (Random.fraction() * (last.rank - first.rank + 2));
  else
    return 0;
};

Template.buttons({
  'click #add': function () {
    var words = ["violet", "unicorn", "flask", "jar", "leitmotif", "rearrange", "right", "ethereal"];
    Items.insert({text: Random.choice(words) + " " + Random.hexString(2), rank: randomRank()});
  },
  'click #remove': function () {
    var item = Random.choice(Items.find().fetch());
    Items.remove(item._id);
  },
  'click #move': function () {
    var item = Random.choice(Items.find().fetch());
    if (item) {
      var firstRank = Items.findOne({}, {sort: {rank: 1}}).rank;
      var lastRank = Items.findOne({}, {sort: {rank: -1}}).rank;
      var newRank = Random.choice([firstRank - 1, lastRank + 1]);
      Items.update(item._id, {$set: {rank: newRank}});
    }
  }
});

$.fx.speeds._default = 2000;

// xcxc `UI.body.rendered` didn't work. Why?
UI.body.attached = function () {
  $('#list').sortable({
    stop: function (event, ui) {
      var el = ui.item.get(0);
      var before = ui.item.prev().get(0);
      var after = ui.item.next().get(0);

      var newRank;
      if (!before) { // moving to the top of the list
        newRank = Ranks.beforeFirst(after.$ui.data().rank);
      } else if (!after) { // moving to the bottom of the list
        newRank = Ranks.afterLast(before.$ui.data().rank);
      } else {
        newRank = Ranks.between(before.$ui.data().rank, after.$ui.data().rank);
      }

      Items.update(el.$ui.data()._id, {$set: {rank: newRank}});
    }
  });

  var animateIn = function (n, parent, next, onComplete) {
    parent.insertBefore(n, next);
    var $n = $(n);
    var height = $n.height();
    var paddingTop = parseInt($n.css("paddingTop"), 10);
    var paddingBottom = parseInt($n.css("paddingBottom"), 10);
    var marginTop = parseInt($n.css("marginTop"), 10);
    var marginBottom = parseInt($n.css("marginBottom"), 10);
    var borderTop = parseInt($n.css("borderTop"), 10);
    var borderBottom = parseInt($n.css("borderBottom"), 10);

    $n.css({
      height: 0,
      paddingTop: 0,
      paddingBottom: 0,
      marginTop: 0,
      marginBottom: 0,
      borderTopWidth: 0,
      borderBottomWidth: 0,
      overflow: "hidden"
    });

    $n.animate({
      height: height,
      paddingTop: paddingTop,
      paddingBottom: paddingBottom,
      marginTop: marginTop,
      marginBottom: marginBottom,
      borderTopWidth: borderTop,
      borderBottomWidth: borderBottom
    }, function () {
      onComplete && onComplete();
    });
  };

  var animateOut = function (n, onComplete) {
    var $n = $(n);
    $n.css({
      overflow: "hidden"
    });
    var marginTop = $n.css('marginTop');

    $n.animate({
      height: 0,
      paddingTop: 0,
      paddingBottom: 0,
      marginTop: 0,
      marginBottom: 0,
      borderTopWidth: 0,
      borderBottomWidth: 0
    }, function () {
      n.parentNode.removeChild(n);
      onComplete && onComplete();
    });
  };

  var animateQueue = [];
  var animationActive = false;
  var moveActive = false;
  var runOrQueue = function(f) {
    if (animationActive) {
      animateQueue.push(f);
    } else {
      animationActive = true;
      f();
    }
  };
  var runOrQueueIfMoving = function(f) {
    if (moveActive) {
      animateQueue.push(f);
    } else {
      animationActive = true;
      f();
    }
  };
  var dequeue = function () {
    animationActive = false;
    moveActive = false;
    if (animateQueue.length > 0) {
      animationActive = true;
      animateQueue.pop()();
    }
  };

  $('#list')[0].$uihooks = {
    insertElement: function (n, parent, next) {
      runOrQueueIfMoving(function () {
        animateIn(n, parent, next, dequeue);
      });
    },
    removeElement: function (n) {
      runOrQueueIfMoving(function () {
        animateOut(n, dequeue);
      });
    },
    moveElement: function (n, parent, next) {
      runOrQueue(function () {
        moveActive = true;
        // - make an empty clone of `n` that will animate out of existence,
        //
        // - make an empty clone of `n` that will animate into existence
        // - at the desired new position
        //
        // - give `n` absolute positioning, and move it to its desired
        // - new position
        var $n = $(n);
        var pos = $n.position();

        var newPositionPlaceholder = $n.clone();
        newPositionPlaceholder.css({visibility: 'hidden'});
        animateIn(newPositionPlaceholder[0], parent, next);

        var oldPositionPlacePlaceholder = $n.clone();
        $n.css({
          position: 'absolute',
          top: pos.top,
          left: pos.left
        });

        var clonePos = newPositionPlaceholder.position();

        oldPositionPlacePlaceholder.css({visibility: 'hidden'});
        parent.insertBefore(oldPositionPlacePlaceholder[0], $n.next()[0]);
        animateOut(oldPositionPlacePlaceholder[0]);

        $n.animate({
          top: clonePos.top,
          left: clonePos.left
        }, function () {
          newPositionPlaceholder.remove();
          $n.css({position: "static"});
          parent.insertBefore(n, next);
          dequeue();
        });
      });
    }
  };
};
