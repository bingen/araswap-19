from shadowlands.sl_dapp import SLDapp
from shadowlands.sl_frame import SLFrame
from shadowlands.sl_contract import SLContract
from shadowlands.sl_contract.erc20 import Erc20
from decimal import Decimal

from araswap.araswap import Araswap

from shadowlands.tui.debug import debug, end_debug
import pdb

class Dapp(SLDapp):
    def initialize(self):
        # Define any variables that will be useful to you, such as contracts.
        # Any other setup steps go here
        ARASWAP_ADDRESS = "0xccf2d2beecec38b95bc4bf9cfde212c9b76a3558"
        #debug(); pdb.set_trace()

        self.araswap_contract = Araswap(self.node, address=ARASWAP_ADDRESS)
        #self.eth_pool = Decimal(self.araswap_contract.functions.getEthPool() / (10 ** 18))
        #self.token_pool = Decimal(self.araswap_contract.functions.tokenPool() / (10 ** 18))
        self.eth_pool = 10
        self.token_pool = 1000

        # add a frame to begin the user interface
        self.add_sl_frame(MyMenuFrame(self, height=40, width=80, title="Araswap!"))

class MyMenuFrame(SLFrame):
    def initialize(self):
        #self.add_label(self.dapp.node.NETWORK_DICT)
        self.add_label("Current Eth pool: {}".format(
                self.token_decorator(self.dapp.eth_pool)
        ))
        self.add_label("Current Token pool: {}".format(
                self.token_decorator(self.dapp.token_pool)
        ))
        self.add_divider()
        self.add_label("Pool management")
        self.pool_eth_value = self.add_textbox("Eth value?")
        self.add_button_row([
            ("Add to pool", self.addToPool, 0),
            ("Withdraw from pool", self.removeFromPool, 1)
        ])
        self.add_divider()
        self.add_label("Araswapping")
        self.swap_eth_value = self.add_textbox("Eth value?")
        self.add_button_row([
            ("Sell Tokens", self.sellTokens, 0),
            ("Buy Tokens", self.buyTokens, 1)
        ])
        self.add_divider()
        self.add_button(self.close, "Close")


    def token_decorator(self, tokens):
        return "{:f}".format(tokens)[:12]

    def checkValue(self, text_value):
        try:
            eth = Decimal(text_value())
        except:
            self.dapp.add_message_dialog("That number doesn't make sense.")
            return False

        return True

    def addToPool(self):
        if not self.checkValue(self.pool_eth_value):
            return
        addToPoolFn = self.dapp.araswap_contract.functions.addToPool()
        self.dapp.add_transaction_dialog(
            addToPoolFn,
            "Adding to pool.",
            gas_limit=200000
        )
    def removeFromPool(self):
        if self.checkValue(self.pool_eth_value):
            self.dapp.add_message_dialog("Removing from pool.")
    def sellTokens(self):
        if self.checkValue(self.swap_eth_value):
            self.dapp.add_message_dialog("Selling tokens.")
    def buyTokens(self):
        if self.checkValue(self.swap_eth_value):
            self.dapp.add_message_dialog("Buying tokens.")
