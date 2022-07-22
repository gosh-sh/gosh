
import { FlexContainer, Flex } from "./../../components";
import { EmojiHappyIcon } from '@heroicons/react/outline';
import InputBase from '@mui/material/InputBase';
import Typography from "@mui/material/Typography";
import CopyClipboard from "./../../components/CopyClipboard";

export const Settings = () => {
  return (
    <>
      <div className="page-header">
        <FlexContainer
          direction="column"
          justify="space-between"
          align="stretch"
        >
          <Flex>
            <h2 className="font-semibold text-2xl mb-5">Settings</h2>
          </Flex>

          <Flex>

            <div className={"gosh-root-address"}>

            <Typography>Gosh root address</Typography>

              <div className={"wallet-address-copy-wrapper"}>
                <InputBase
                  className="input-field"
                  type="text"
                  value={process.env.REACT_APP_GOSH_ADDR || ""}
                  onChange={() => {}}
                  disabled
                  />
                  <CopyClipboard
                      componentProps={{
                          text: process.env.REACT_APP_GOSH_ADDR || ""
                      }}
                  />

              </div>
            </div>
          </Flex>
        </FlexContainer>
      </div>
      <div className="no-data"><EmojiHappyIcon/>You have nothing to tune yet</div>
    </>
  );
}

export default Settings;
