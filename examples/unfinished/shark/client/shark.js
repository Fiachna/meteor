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

Template.buttons({
  'click #add': function () {
    var firstRank = Items.findOne({}, {sort: {rank: 1}}).rank;
    var lastRank = Items.findOne({}, {sort: {rank: -1}}).rank;
    var newRank = firstRank-1 + (Random.fraction() * (lastRank - firstRank + 2));
    Items.insert({text: "Hello", rank: newRank});
  },
  'click #remove': function () {
    var item = Random.choice(Items.find().fetch());
    Items.remove(item._id);
  }
});

$.fx.speeds._default = 2000;

// xcxc rendered didn't work and was surprising.
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
    $n.next().css({
      marginTop: 0
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
    $n.next().animate({
      // assume that all elements in this list have the same margin-top
      marginTop: marginTop
    });
  };

  var animateOut = function (n, onComplete) {
    var $n = $(n);
    $n.css({
      overflow: "hidden"
    });
    var marginTop = $n.css('marginTop');
    var $next = $n.next();
    $next.animate({
      marginTop: 0
    });
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
      // assume that all elements in this list have the same margin-top
      $next.css({marginTop: marginTop});
      onComplete && onComplete();
    });
  };

  $('#list')[0].$uihooks = {
    insertElement: function (n, parent, next) {
      animateIn(n, parent, next);
    },
    removeElement: function (n) {
      animateOut(n);
    },
    moveElement: function (n, parent, next) {
      // - make an empty clone of `n` that will animate out of existence,
      //
      // - make an empty clone of `n` that will animate into existence
      // - at the desired new position
      //
      // - give `n` absolute positioning, and move it to its desired
      // - new position
      var $n = $(n);
      var pos = $n.position();

      var appearingClone = $n.clone(); // xcxc names
      appearingClone.css({visibility: 'hidden'});
      animateIn(appearingClone[0], parent, next);

      var disappearingClone = $n.clone(); // xcxc names
      $n.css({
        position: 'absolute',
        top: pos.top,
        left: pos.left
      });

      var clonePos = appearingClone.position();

      disappearingClone.css({visibility: 'hidden'});
      parent.insertBefore(disappearingClone[0], $n.next()[0]);
      animateOut(disappearingClone[0]);

      $n.animate({
        top: clonePos.top,
        marginTop: 0, // xcxc why?
        left: clonePos.left
      }, function () {
        appearingClone.remove();
        $n.css({position: "static"});
        parent.insertBefore(n, next);
      });
    }
  };
};
