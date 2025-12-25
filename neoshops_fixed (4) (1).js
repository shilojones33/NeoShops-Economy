// NeoShops + Economy System for KubeJS 7.x (Minecraft 1.21.1)
// Author: XxTheyLuvShyxX

console.info ('╔══════════════════════════════════════════════════════════════════════════╗');
console.info ('║                                                                          ║');
console.info ('║   ███╗   ██╗███████╗ ██████╗ ███████╗██╗  ██╗ ██████╗ ██████╗ ███████╗   ║');
console.info ('║   ████╗  ██║██╔════╝██╔═══██╗██╔════╝██║  ██║██╔═══██╗██╔══██╗██╔════╝   ║');
console.info ('║   ██╔██╗ ██║█████╗  ██║   ██║███████╗███████║██║   ██║██████╔╝███████╗   ║');
console.info ('║   ██║╚██╗██║██╔══╝  ██║   ██║╚════██║██╔══██║██║   ██║██╔═══╝ ╚════██║   ║');
console.info('║   ██║ ╚████║███████╗╚██████╔╝███████║██║  ██║╚██████╔╝██║     ███████║   ║');
console.info('║   ╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚══════╝   ║');
console.info('║                          + ECONOMY                                       ║');
console.info('║                                                                          ║');
console.info('║                   Book-Based Shop System                                 ║');
console.info('║                   Player Economy Enabled                                 ║');
console.info('║                   Shops Tied to Book Authors                             ║');
console.info('║                                                                          ║');
console.info('║                   Author: XxTheyLuvShyxX                                 ║');
console.info('║                                                                          ║');
console.info('╚══════════════════════════════════════════════════════════════════════════╝');

// ==================== CONFIGURATION ====================
const CONFIG = {
  currency: '$',
  startingBalance: 1000,
  rayDistance: 5
};

// ==================== ECONOMY SYSTEM ====================
const Economy = {
  getData: function(server) {
    if (!server.persistentData.contains('balances')) {
      server.persistentData.put('balances', {});
    }
    return server.persistentData.get('balances');
  },

  getBalance: function(server, uuid) {
    let balances = this.getData(server);
    let balance = balances[uuid];
    balance = parseFloat(balance);
    if (isNaN(balance)) {
      balance = CONFIG.startingBalance;
      balances[uuid] = balance;
      server.persistentData.put('balances', balances);
    }
    return balance;
  },

  setBalance: function(server, uuid, amount) {
    let balances = this.getData(server);
    if (isNaN(amount)) {
      amount = CONFIG.startingBalance;
    }
    balances[uuid] = Math.max(0, amount);
    server.persistentData.put('balances', balances);
  },

  addBalance: function(server, uuid, amount) {
    let current = this.getBalance(server, uuid);
    this.setBalance(server, uuid, current + amount);
  }
};

// ==================== SHOP REGISTRY ====================
const ShopRegistry = {
  getData: function(server) {
    if (!server.persistentData.contains('shops')) {
      server.persistentData.put('shops', {});
    }
    return server.persistentData.get('shops');
  },

  getShop: function(server, posKey) {
    let shops = this.getData(server);
    return shops[posKey] || null;
  },

  registerShop: function(server, posKey, shopData) {
    let shops = this.getData(server);
    shops[posKey] = shopData;
    server.persistentData.put('shops', shops);
  },

  deleteShop: function(server, posKey) {
    let shops = this.getData(server);
    delete shops[posKey];
    server.persistentData.put('shops', shops);
  },

  getAllShops: function(server) {
    return this.getData(server);
  }
};

// ==================== UTILITY FUNCTIONS ====================
function parseBookConfig(itemStack, isAdmin) {
  if (!itemStack || itemStack.isEmpty()) return null;

  let itemId = itemStack.id;
  
  // Admin shops can use writable books, regular shops need written books
  if (isAdmin && itemId !== 'minecraft:writable_book' && itemId !== 'minecraft:written_book') {
    return { error: 'Admin shops need a writable or written book!' };
  }
  if (!isAdmin && itemId !== 'minecraft:written_book') {
    return { error: 'Must use a SIGNED book (Written Book)! Right-click book and press "Sign".' };
  }

  // Get the book content - try NBT first, then data components
  let bookContent = null;

  console.info('[DEBUG] Trying NBT first...');
  try {
    let nbt = itemStack.nbt;
    console.info('[DEBUG] ItemStack NBT: ' + nbt);
    console.info('[DEBUG] NBT type: ' + typeof nbt);

    if (nbt) {
      // Log the full structure for debugging
      console.info('[DEBUG] Full NBT structure: ' + JSON.stringify(nbt, null, 2));

      // Check for pages in different possible locations
      if (nbt.pages) {
        bookContent = { pages: nbt.pages };
        console.info('[DEBUG] Book content from NBT.pages: ' + JSON.stringify(bookContent));
      } else if (nbt.tag && nbt.tag.pages) {
        bookContent = { pages: nbt.tag.pages };
        console.info('[DEBUG] Book content from NBT.tag.pages: ' + JSON.stringify(bookContent));
      } else if (nbt.tag && nbt.tag.BlockEntityTag && nbt.tag.BlockEntityTag.pages) {
        bookContent = { pages: nbt.tag.BlockEntityTag.pages };
        console.info('[DEBUG] Book content from NBT.tag.BlockEntityTag.pages: ' + JSON.stringify(bookContent));
      } else if (nbt.tag && nbt.tag.BlockEntityTag && nbt.tag.BlockEntityTag.Items) {
        // Check if it's stored in chest contents
        console.info('[DEBUG] Checking chest contents for book...');
        let items = nbt.tag.BlockEntityTag.Items;
        if (items && Array.isArray(items)) {
          for (let i = 0; i < items.length; i++) {
            let item = items[i];
            if (item && item.tag && item.tag.pages) {
              bookContent = { pages: item.tag.pages };
              console.info('[DEBUG] Book content from chest item: ' + JSON.stringify(bookContent));
              break;
            }
          }
        }
      }

      // Try direct access to common book data locations
      if (!bookContent) {
        console.info('[DEBUG] Trying direct access to book data...');
        if (nbt.tag && nbt.tag.pages) {
          bookContent = { pages: nbt.tag.pages };
        } else if (nbt.pages) {
          bookContent = { pages: nbt.pages };
        }
      }
    }
  } catch (e) {
    console.info('[DEBUG] NBT access failed: ' + e);
  }

  // If NBT didn't work, try data components
  if (!bookContent) {
    console.info('[DEBUG] NBT failed, trying data components...');

    if (itemId === 'minecraft:written_book') {
      // Try to get the written_book_content component
      let writtenBookContent = itemStack.get('written_book_content');
      console.info('[DEBUG] Written book content from component: ' + writtenBookContent);

      if (writtenBookContent) {
        // In KubeJS, we need to call the pages() method
        try {
          let pagesList = writtenBookContent.pages();
          console.info('[DEBUG] Pages from method call: ' + pagesList);
          console.info('[DEBUG] Pages list type: ' + typeof pagesList);

          if (pagesList) {
            // Convert Java List<Filterable> to JavaScript array of raw strings
            let pages = [];
            for (let i = 0; i < pagesList.size(); i++) {
              let pageObj = pagesList.get(i);
              let pageString = pageObj.toString();
              let rawMatch = pageString.match(/raw=literal\{([^}]+)\}/);
              if (rawMatch && rawMatch[1]) {
                pages.push(rawMatch[1]);
              } else {
                pages.push(pageString);
              }
            }
            console.info('[DEBUG] Converted pages array: ' + JSON.stringify(pages));
            bookContent = { pages: pages };
          }
        } catch (e) {
          console.info('[DEBUG] Error calling pages() method: ' + e);
        }
      }
    } else if (itemId === 'minecraft:writable_book') {
      // Try to get the writable_book_content component
      let writableBookContent = itemStack.get('writable_book_content');
      console.info('[DEBUG] Writable book content from component: ' + writableBookContent);

      if (writableBookContent) {
        try {
          let pagesList = writableBookContent.pages();
          console.info('[DEBUG] Pages from method call: ' + pagesList);
          console.info('[DEBUG] Pages list type: ' + typeof pagesList);

          if (pagesList) {
            // Convert Java List to JavaScript array
            let pages = [];
            for (let i = 0; i < pagesList.size(); i++) {
              pages.push(pagesList.get(i));
            }
            console.info('[DEBUG] Converted pages array: ' + JSON.stringify(pages));
            bookContent = { pages: pages };
          }
        } catch (e) {
          console.info('[DEBUG] Error calling pages() method: ' + e);
        }
      }
    }
  }

  if (!bookContent) {
    console.info('[DEBUG] No book content found via any method');
    return { error: 'Could not read book data! Book might be empty.' };
  }

  console.info('[DEBUG] Final book content: ' + JSON.stringify(bookContent));
  console.info('[DEBUG] Book content pages: ' + bookContent.pages);
  console.info('[DEBUG] Pages type: ' + typeof bookContent.pages);
  console.info('[DEBUG] Pages length: ' + (bookContent.pages ? bookContent.pages.length : 'undefined'));

  if (!bookContent.pages || bookContent.pages.length === 0) {
    console.info('[DEBUG] Book has no pages');
    return { error: 'Book has no pages!' };
  }

  // Get first page - in 1.21.1, pages are stored as Filterable objects
  let firstPage = bookContent.pages[0];
  console.info('[DEBUG] First page: ' + firstPage);

  // If it's a Filterable object, extract the raw content
  if (typeof firstPage === 'object' && firstPage.toString) {
    let filterableString = firstPage.toString();
    console.info('[DEBUG] Filterable string: ' + filterableString);

    // Extract the raw content from Filterable[raw=literal{...}, filtered=...]
    let rawMatch = filterableString.match(/raw=literal\{([^}]+)\}/);
    if (rawMatch && rawMatch[1]) {
      firstPage = rawMatch[1];
      console.info('[DEBUG] Extracted raw content: ' + firstPage);
    } else {
      firstPage = filterableString;
    }
  }

  // If it's a text component object, extract the text
  if (typeof firstPage === 'object' && firstPage.text) {
    firstPage = firstPage.text;
  } else if (typeof firstPage === 'object' && firstPage.raw) {
    firstPage = firstPage.raw;
  }

  // Convert to string
  let pageText = String(firstPage);
  pageText = pageText.trim();

  // If it's JSON text component format, try to parse it
  if (pageText.startsWith('{') || pageText.startsWith('[')) {
    try {
      let parsed = JSON.parse(pageText);
      if (parsed.text) {
        pageText = parsed.text;
      } else if (typeof parsed === 'string') {
        pageText = parsed;
      }
    } catch (e) {
      // Not JSON, use as-is
    }
  }

  // Trim leading { if present and not valid JSON (common issue with book formatting)
  if (pageText.startsWith('{') && !pageText.endsWith('}')) {
    pageText = pageText.substring(1);
  }

  // Parse the entire page text for BUY/SELL, item ID, and price
  let upperText = pageText.toUpperCase();

  // Find mode
  let mode = null;
  if (upperText.includes('BUY')) {
    mode = 'BUY';
  } else if (upperText.includes('SELL')) {
    mode = 'SELL';
  } else {
    return { error: 'Page must contain BUY or SELL' };
  }

  // Find item ID using regex (e.g., minecraft:diamond or mod:item)
  let itemMatch = pageText.match(/\b([a-zA-Z_][a-zA-Z0-9_]*:[a-zA-Z_][a-zA-Z0-9_]*)\b/);
  if (!itemMatch) {
    return { error: 'Page must contain a valid item ID (e.g., minecraft:diamond)' };
  }
  let item = itemMatch[1];

  // Find price using regex for digits
  let priceMatch = pageText.match(/\b(\d+)\b/);
  if (!priceMatch) {
    return { error: 'Page must contain a price (numerical digits)' };
  }
  let price = parseInt(priceMatch[1], 10);
  if (isNaN(price) || price <= 0) {
    return { error: 'Price must be a positive number' };
  }

  return {
    mode: mode,
    item: item,
    price: price
  };
}

function getItemDisplayName(itemId) {
  console.info('[DEBUG] getItemDisplayName called with itemId: ' + itemId + ', type: ' + typeof itemId);
  let parts = String(itemId).split(':');
  console.info('[DEBUG] After String conversion, parts: ' + JSON.stringify(parts));
  if (parts.length !== 2) {
    console.info('[DEBUG] Invalid itemId format, returning as string: ' + String(itemId));
    return String(itemId);
  }

  let itemName = parts[1];
  let words = itemName.split('_');
  let capitalized = words.map(function(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
  let display = capitalized.join(' ');

  if (display.length > 15) {
    display = display.substring(0, 12) + '...';
  }

  console.info('[DEBUG] Final display name: ' + display);
  return display;
}

function getBlockBehind(block) {
  let facing = String(block.properties.facing);
  let offsetX = 0;
  let offsetY = 0;
  let offsetZ = 0;

  if (facing === 'north') {
    offsetZ = 1;
  } else if (facing === 'south') {
    offsetZ = -1;
  } else if (facing === 'east') {
    offsetX = -1;
  } else if (facing === 'west') {
    offsetX = 1;
  } else {
    // For standing signs or other, try below
    let below = block.offset(0, -1, 0);
    if (below && below.inventory) return below;
    return null;
  }

  let candidate = block.offset(offsetX, offsetY, offsetZ);
  if (candidate && candidate.inventory) return candidate;

  // Try below for standing signs
  let below = block.offset(0, -1, 0);
  if (below && below.inventory) return below;

  return null;
}

function hasPermission(player, perm) {
  if (player.op) return true;
  if (player.hasPermission('neoshops.*')) return true;
  return player.hasPermission(perm);
}

function getLookingAtShop(player, server) {
  let hit = player.rayTrace(CONFIG.rayDistance);
  if (!hit || !hit.block) return null;

  let block = hit.block;
  if (!block.id.includes('sign')) return null;

  let posKey = block.pos.x + ',' + block.pos.y + ',' + block.pos.z;
  let shop = ShopRegistry.getShop(server, posKey);
  
  if (!shop) return null;

  return {
    block: block,
    shop: shop,
    posKey: posKey
  };
}

// ==================== BLOCK EVENTS ====================
BlockEvents.placed(function(event) {
  let player = event.player;
  let block = event.block;
  let server = event.server;

  console.info('[DEBUG] Block placed event triggered for block: ' + block.id);
  if (!block.id.includes('sign')) {
    console.info('[DEBUG] Block is not a sign, ignoring');
    return;
  }

  let playerData = player.persistentData;
  console.info('[DEBUG] Checking shop_arm flag for player: ' + player.username);
  if (!playerData.getBoolean('shop_arm')) {
    console.info('[DEBUG] shop_arm is false, not creating shop');
    return;
  }

  console.info('[DEBUG] shop_arm is true, proceeding with shop creation');
  playerData.putBoolean('shop_arm', false);

  let isAdmin = playerData.getBoolean('shop_admin');
  console.info('[DEBUG] Admin mode: ' + isAdmin);
  playerData.putBoolean('shop_admin', false);

  if (isAdmin && !hasPermission(player, 'neoshops.admin')) {
    console.info('[DEBUG] Player lacks admin permission for admin shop creation');
    player.tell('§cYou do not have permission to create admin shops.');
    return;
  }

  console.info('[DEBUG] Finding block behind sign');
  let backBlock = getBlockBehind(block);
  if (!backBlock || !backBlock.inventory) {
    console.info('[DEBUG] No valid chest/barrel found behind sign');
    player.tell('§cSign must be placed on a chest or barrel!');
    return;
  }

  console.info('[DEBUG] Found back block with inventory: ' + backBlock.id);
  let inventory = backBlock.inventory;
  let bookStack = null;

  // Search through inventory
  console.info('[DEBUG] Searching for book in chest inventory');
  if (inventory.allItems) {
    for (let idx = 0; idx < inventory.allItems.length; idx = idx + 1) {
      let itemStack = inventory.allItems[idx];
      if (itemStack && !itemStack.isEmpty()) {
        let itemId = String(itemStack.id);
        console.info('[DEBUG] Checking item: ' + itemId);
        if (itemId === 'minecraft:written_book' || (isAdmin && itemId === 'minecraft:writable_book')) {
          bookStack = itemStack;
          console.info('[DEBUG] Found valid book: ' + itemId);
          break;
        }
      }
    }
  }

  if (!bookStack) {
    console.info('[DEBUG] No valid book found in chest');
    if (isAdmin) {
      player.tell('§cNo book found in chest!');
      player.tell('§7Put a written book or writable book in the chest.');
    } else {
      player.tell('§cNo SIGNED book found in chest!');
      player.tell('§7You must use a SIGNED book (Written Book).');
      player.tell('§7Write in a Book and Quill, then right-click and press "Sign".');
    }
    player.tell('§7Format: Line 1: BUY/SELL | Line 2: minecraft:diamond | Line 3: 100');
    return;
  }

  console.info('[DEBUG] Parsing book configuration');
  let config = parseBookConfig(bookStack, isAdmin);

  if (!config || config.error) {
    console.info('[DEBUG] Book parsing failed: ' + (config ? config.error : 'Unknown error'));
    player.tell('§c' + (config ? config.error : 'Invalid book format!'));
    player.tell('§7Format: Line 1: BUY/SELL | Line 2: minecraft:diamond | Line 3: 100');
    return;
  }

  console.info('[DEBUG] Book parsed successfully - Mode: ' + config.mode + ', Item: ' + config.item + ', Price: ' + config.price);
  let posKey = block.pos.x + ',' + block.pos.y + ',' + block.pos.z;
  console.info('[DEBUG] Registering shop at position: ' + posKey);

  ShopRegistry.registerShop(server, posKey, {
    owner: player.uuid.toString(),
    ownerName: player.username,
    admin: isAdmin,
    mode: config.mode,
    item: config.item,
    price: config.price
  });

  console.info('[DEBUG] Shop registered successfully');
  let displayName = getItemDisplayName(config.item);
  console.info('[DEBUG] Display name generated: ' + displayName);

  // Update sign text
  console.info('[DEBUG] Updating sign text');
  let signData = block.entityData;
  signData.front_text = signData.front_text || {};
  signData.front_text.messages = [
    '{"text":"' + config.mode + '"}',
    '{"text":"' + displayName + '"}',
    '{"text":"' + CONFIG.currency + config.price + '"}',
    '{"text":"[Click]"}'
  ];
  block.entityData = signData;

  console.info('[DEBUG] Sign text updated, shop creation complete');
  player.tell('§aShop created: ' + config.mode + ' ' + displayName + ' @ ' + CONFIG.currency + config.price);
});

BlockEvents.rightClicked(function(event) {
  let player = event.player;
  let block = event.block;
  let server = event.server;

  // Check if clicking on a chest that might be a shop chest
  if (block.id.includes('chest') || block.id.includes('barrel')) {
    // Check all adjacent blocks for signs
    let directions = [
      { x: 0, y: 0, z: 1 },   // north
      { x: 0, y: 0, z: -1 },  // south
      { x: 1, y: 0, z: 0 },   // east
      { x: -1, y: 0, z: 0 },  // west
      { x: 0, y: 1, z: 0 },   // up
      { x: 0, y: -1, z: 0 }   // down
    ];

    for (let dir of directions) {
      let adjacentBlock = block.offset(dir.x, dir.y, dir.z);
      if (adjacentBlock && adjacentBlock.id.includes('sign')) {
        let posKey = adjacentBlock.pos.x + ',' + adjacentBlock.pos.y + ',' + adjacentBlock.pos.z;
        let shop = ShopRegistry.getShop(server, posKey);
        if (shop && !shop.admin && shop.owner !== player.uuid.toString()) {
          player.tell('§cThis shop chest is locked! Only the owner can access it.');
          event.cancel();
          return;
        }
      }
    }
  }

  if (!block.id.includes('sign')) return;

  let posKey = block.pos.x + ',' + block.pos.y + ',' + block.pos.z;
  let shop = ShopRegistry.getShop(server, posKey);

  if (!shop) return;

  // Ensure price is a number
  shop.price = parseFloat(shop.price) || 0;

  if (shop.admin && !hasPermission(player, 'neoshops.player')) {
    player.tell('§cYou do not have permission to use admin shops.');
    return;
  }

  let qty = player.crouching ? 64 : 1;
  let cost = shop.price * qty;

  if (shop.mode === 'BUY') {
    let balance = Economy.getBalance(server, player.uuid.toString());
    if (balance < cost) {
      player.tell('§cInsufficient funds! Need ' + CONFIG.currency + cost + ', have ' + CONFIG.currency + balance);
      return;
    }

    if (!shop.admin) {
      let backBlock = getBlockBehind(block);
      if (!backBlock || !backBlock.inventory) {
        player.tell('§cShop chest is missing!');
        return;
      }

      let stockCount = backBlock.inventory.count(Item.of(shop.item));
      if (stockCount < qty) {
        player.tell('§cOut of stock! (Only ' + stockCount + ' available)');
        return;
      }

      backBlock.inventory.take(Item.of(shop.item), qty, false);
      backBlock.setChanged();
      backBlock.updateNeighbours();
    }

    Economy.addBalance(server, player.uuid.toString(), -cost);
    Economy.addBalance(server, shop.owner, cost);
    player.give(Item.of(shop.item, qty));
    let itemName = getItemDisplayName(shop.item).toLowerCase();
    if (qty > 1) {
      itemName += 's';
    }
    player.tell('§aPurchased ' + qty + ' ' + itemName + ' for ' + CONFIG.currency + shop.price + (qty > 1 ? ' each' : '') + ' from ' + shop.ownerName);

    // Notify shop owner
    if (!shop.admin) {
      console.info('[DEBUG] Attempting to notify shop owner for BUY transaction');
      console.info('[DEBUG] Shop owner UUID: ' + shop.owner);
      let ownerPlayer = server.getPlayer(shop.owner);
      console.info('[DEBUG] Owner player found: ' + (ownerPlayer ? 'yes' : 'no'));
      if (ownerPlayer) {
        let notificationMsg = '§a' + player.username + ' bought ' + qty + ' ' + itemName + ' for ' + CONFIG.currency + cost + ' from your shop!';
        console.info('[DEBUG] Sending notification: ' + notificationMsg);
        ownerPlayer.tell(notificationMsg);
      } else {
        console.info('[DEBUG] Owner player not online, notification skipped');
      }
    }

  } else {
    let playerStock = player.inventory.count(shop.item);
    if (playerStock < qty) {
      player.tell('§cYou need ' + qty + 'x (you have ' + playerStock + ')');
      return;
    }

    if (!shop.admin) {
      let backBlock = getBlockBehind(block);
      if (!backBlock || !backBlock.inventory) {
        player.tell('§cShop chest is missing!');
        return;
      }

      backBlock.inventory.insert(Item.of(shop.item), qty, false);
      backBlock.setChanged();
      backBlock.updateNeighbours();
    }

    let ownerBalance = Economy.getBalance(server, shop.owner);
    if (ownerBalance < cost) {
      player.tell('§cShop owner has insufficient funds!');
      return;
    }

    player.inventory.extract(Item.of(shop.item), qty, false);
    Economy.addBalance(server, player.uuid.toString(), cost);
    Economy.addBalance(server, shop.owner, -cost);
    let itemName = getItemDisplayName(shop.item).toLowerCase();
    if (qty > 1) {
      itemName += 's';
    }
    player.tell('§aSold ' + qty + ' ' + itemName + ' for ' + CONFIG.currency + shop.price + (qty > 1 ? ' each' : '') + ' to ' + shop.ownerName);

    // Notify shop owner
    if (!shop.admin) {
      console.info('[DEBUG] Attempting to notify shop owner for SELL transaction');
      console.info('[DEBUG] Shop owner UUID: ' + shop.owner);
      let ownerPlayer = server.getPlayer(shop.owner);
      console.info('[DEBUG] Owner player found: ' + (ownerPlayer ? 'yes' : 'no'));
      if (ownerPlayer) {
        let notificationMsg = '§a' + player.username + ' sold ' + qty + ' ' + itemName + ' for ' + CONFIG.currency + cost + ' to your shop!';
        console.info('[DEBUG] Sending notification: ' + notificationMsg);
        ownerPlayer.tell(notificationMsg);
      } else {
        console.info('[DEBUG] Owner player not online, notification skipped');
      }
    }
  }

  // Cancel the event to prevent sign editing
  event.cancel();
});

// ==================== COMMANDS ====================
ServerEvents.commandRegistry(function(event) {
  let Commands = event.commands;
  let Arguments = event.arguments;

  event.register(
    Commands.literal('bal')
      .executes(function(ctx) {
        let player = ctx.source.player;
        let server = ctx.source.server;
        let balance = Economy.getBalance(server, player.uuid.toString());
        player.tell('§eBalance: ' + CONFIG.currency + balance);
        return 1;
      })
  );

  event.register(
    Commands.literal('pay')
      .then(
        Commands.argument('target', Arguments.PLAYER.create(event))
          .then(
            Commands.argument('amount', Arguments.INTEGER.create(event))
              .executes(function(ctx) {
                let sender = ctx.source.player;
                let server = ctx.source.server;
                let target = Arguments.PLAYER.getResult(ctx, 'target');
                let amount = Arguments.INTEGER.getResult(ctx, 'amount');

                if (!target) {
                  sender.tell('§cPlayer not found!');
                  return 0;
                }

                if (amount <= 0) {
                  sender.tell('§cAmount must be positive!');
                  return 0;
                }

                let senderBalance = Economy.getBalance(server, sender.uuid.toString());
                if (senderBalance < amount) {
                  sender.tell('§cInsufficient funds!');
                  return 0;
                }

                Economy.addBalance(server, sender.uuid.toString(), -amount);
                Economy.addBalance(server, target.uuid.toString(), amount);

                sender.tell('§aSent ' + CONFIG.currency + amount + ' to ' + target.username);
                target.tell('§aReceived ' + CONFIG.currency + amount + ' from ' + sender.username);
                return 1;
              })
          )
      )
  );

  event.register(
    Commands.literal('shopadd')
      .executes(function(ctx) {
        let player = ctx.source.player;
        player.persistentData.putBoolean('shop_arm', true);
        player.persistentData.putBoolean('shop_admin', false);
        player.tell('§e=== How to Create a Shop ===');
        player.tell('§71. Write in a Book and Quill');
        player.tell('§72. RIGHT-CLICK the book and press "Sign" to sign it');
        player.tell('§73. Put the SIGNED book in a chest');
        player.tell('§74. Place a sign on the chest');
        player.tell('§7Book Format: Line 1: BUY/SELL | Line 2: minecraft:diamond | Line 3: 100');
        return 1;
      })
  );

  event.register(
    Commands.literal('shopaddadmin')
      .executes(function(ctx) {
        let player = ctx.source.player;
        
        if (!hasPermission(player, 'neoshops.admin')) {
          player.tell('§cYou do not have permission!');
          return 0;
        }

        player.persistentData.putBoolean('shop_arm', true);
        player.persistentData.putBoolean('shop_admin', true);
        player.tell('§eAdmin Mode: Place a sign on a chest with a book inside.');
        return 1;
      })
  );

  event.register(
    Commands.literal('shopremove')
      .executes(function(ctx) {
        let player = ctx.source.player;
        let server = ctx.source.server;
        let result = getLookingAtShop(player, server);

        if (!result) {
          player.tell('§cNo shop targeted. Look at a shop sign!');
          return 0;
        }

        let isOwner = result.shop.owner === player.uuid.toString();
        let isAdmin = hasPermission(player, 'neoshops.admin');

        if (!isOwner && !isAdmin) {
          player.tell('§cYou do not own this shop!');
          return 0;
        }

        ShopRegistry.deleteShop(server, result.posKey);
        player.tell('§aShop removed!');
        return 1;
      })
  );

  event.register(
    Commands.literal('shopinfo')
      .executes(function(ctx) {
        let player = ctx.source.player;
        let server = ctx.source.server;
        let result = getLookingAtShop(player, server);

        if (!result) {
          player.tell('§cNo shop targeted!');
          return 0;
        }

        let shop = result.shop;
        player.tell('§e--- Shop Info ---');
        player.tell('§7Mode: ' + shop.mode);
        player.tell('§7Item: ' + shop.item);
        player.tell('§7Price: ' + CONFIG.currency + shop.price);
        player.tell('§7Admin Shop: ' + (shop.admin ? 'Yes' : 'No'));
        return 1;
      })
  );

  event.register(
    Commands.literal('listshops')
      .executes(function(ctx) {
        let player = ctx.source.player;
        let server = ctx.source.server;
        let uuid = player.uuid.toString();
        let shops = ShopRegistry.getAllShops(server);

        let count = 0;
        let keys = Object.keys(shops);
        for (let i = 0; i < keys.length; i = i + 1) {
          let key = keys[i];
          let shop = shops[key];
          if (shop.owner === uuid) {
            player.tell('§7' + shop.mode + ' ' + shop.item + ' @ ' + CONFIG.currency + shop.price);
            count = count + 1;
          }
        }

        if (count === 0) {
          player.tell('§7You have no shops.');
        }
        return 1;
      })
  );

  event.register(
    Commands.literal('shopspublic')
      .executes(function(ctx) {
        let player = ctx.source.player;
        let server = ctx.source.server;
        let shops = ShopRegistry.getAllShops(server);

        let count = 0;
        let keys = Object.keys(shops);
        for (let i = 0; i < keys.length; i = i + 1) {
          let key = keys[i];
          let shop = shops[key];
          let adminTag = shop.admin ? ' §e[ADMIN]' : '';
          player.tell('§7' + shop.mode + ' ' + shop.item + ' @ ' + CONFIG.currency + shop.price + adminTag);
          count = count + 1;
        }

        if (count === 0) {
          player.tell('§7No shops available.');
        }
        return 1;
      })
  );
});

console.info('[NeoShops] Loaded successfully!');
console.info('[NeoShops] Remember: Players must use SIGNED books (Written Books) to create shops!');