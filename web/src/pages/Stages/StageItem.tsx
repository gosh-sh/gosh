import { useState } from "react";
import { DraggableProvided } from "react-beautiful-dnd";

interface IStageItemProps extends React.HTMLAttributes<HTMLDivElement> {
  provided: DraggableProvided;
  isDragging?: boolean;
  name: string;
  type: string | "tree";
}

export const StageItem = ({
  provided,
  to,
  name,
  type,
  isDragging,
  view = "tiles",
  className,
  ...props
}: IStageItemProps) => {
  const [selected, setSelected] = useState<boolean>(false);
  return (
    <div
      aria-label={name}
      className={classNames(className, "")}
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      {...props}
      onClick={(e) => {
        setSelected(true);
        props.onClick && props.onClick(e);
      }}
    >
      <div
        key={index}
        className={classNames(
          "flex flex-wrap gap-x-4 gap-y-2 z-0 items-center px-4 py-3 чtext-sm rounded-lg border-solid active:rounded-lg mb-2 transition-all",
          branchesTouched
            ? "bg-[#ffffff] border-[1px] border-[#d6d9e130] shadow-lg hover:scale-[1.02]"
            : "bg-[#fafafb] border-[1px] border-[#d6d9e160]",
          branchesTouched && "wobbling-items",
        )}
        style={{ transform: "translate(0, 0)" }}
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
      >
        <Droppable
          droppableId="stage"
          // type="PERSON"
          // draggableId={item.name}
          // index={index}
        >
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grow flex flex-row items-center gap-3 basis-2"
            >
              <div className={classNames("opacity-20")}>{IconDrag}</div>
              <Link
                to={`/o/${daoName}/r/${repoName}/tree/${branch.name}`}
                className={classNames(
                  "mr-2 transition-all",
                  branch.name === branchName
                    ? "font-bold text-[16px]"
                    : "font-medium hover:opacity-60 text-[14px]",
                )}
              >
                <div className="wobbler inline-block mr-1">
                  {((branch.priority || 0) + 1)?.toLocaleString("en-US", {
                    minimumIntegerDigits: 2,
                    useGrouping: false,
                  })}{" "}
                </div>
                · {branch.name}
                {branch.name === branchName && (
                  <div
                    className={classNames(
                      "inline-block align-middle mt-[- 2px] bg-green-34c759 rounded px-1 text-white text-[10px] ml-1",
                    )}
                  >
                    Current
                  </div>
                )}
              </Link>
            </div>
          )}
        </Droppable>
        <div className="grow-0 grow flex flex-row items-center gap-1 width-[100px] basis-0">
          {dao.details.isAuthMember && (
            <div className="flex gap-x-1">
              <Button
                type="button"
                variant="outline-secondary"
                size="lg"
                onClick={() => submitBranchLock(branch)}
                disabled={
                  branchProgress.isFetching ||
                  (branch.isProtected && !!branch.tags?.length)
                }
                isLoading={
                  branchProgress.isFetching &&
                  branchProgress.type === "(un)lock" &&
                  branchProgress.name === branch.name
                }
                className={classNames(
                  "border-none !px-2 !w-[40px] !h-[40px] flex justify-center items-center",
                  "opacity-[1]",
                  branch.isProtected && !branch.tags?.length
                    ? "!text-black"
                    : "!text-[#BFC5CE]",
                )}
              >
                <FontAwesomeIcon size="lg" icon={faLock} />
              </Button>

              <AnimatePresence mode="wait">
                <Popover as="div" className="relative">
                  <PopoverButton
                    as={Button}
                    test-id="btn-add-stage"
                    variant="outline-secondary"
                    // className="outline-none border-none !px-2 !w-[40px] !h-[40px]"
                    className={classNames(
                      "outline-none border-none !px-2 !w-[40px] !h-[40px]",
                      "opacity-[1]",
                      branch.isProtected && !!branch.tags?.length
                        ? "!text-black"
                        : "!text-[#BFC5CE]",
                    )}
                  >
                    <FontAwesomeIcon size="xl" icon={faHandPaper} />
                  </PopoverButton>
                  <PopoverPanel
                    as={motion.div}
                    className="absolute origin-top-right left-[0px] top-[42px] mt-2 w-auto max-w-[400px] min-w-[200px] md:px-0 z-20 cursor-default"
                    initial={{
                      opacity: 0,
                      translateY: "-0.25rem",
                    }}
                    animate={{
                      opacity: 1,
                      translateY: 0,
                    }}
                    exit={{
                      opacity: 0,
                      translateY: "0.25rem",
                    }}
                    // transition={{ duration: 0.2 }}
                  >
                    <div className="rounded-xl shadow-sm shadow-xl border-[1px] border-[#d6d9e130] bg-white p-4">
                      <Formik
                        initialValues={{
                          tags: branch.tags || [],
                        }}
                        onSubmit={() => {}}
                        validationSchema={yup.object().shape({
                          tags: yup
                            .string()
                            .matches(/^[\w-]+$/, "Name has invalid characters")
                            .max(64, "Max length is 64 characters")
                            .notOneOf(
                              branches.map((b) => b.name),
                              "Stage exists",
                            )
                            .required("Stage name is required"),
                        })}
                      >
                        {({ values, setValues }) => (
                          <Form className="flex flex-col items-start justify-end gap-4">
                            <h3>Select Tags</h3>
                            <div className="rounded-xl bg-white ">
                              {dao.details.expert_tags?.map((tag, index) => {
                                const isChecked = values.tags.includes(
                                  tag.name,
                                );
                                return (
                                  <div
                                    key={index}
                                    className={classNames(
                                      "border border-transparent rounded-3xl p-2 px-4 gap-2 m-1 flex flex-row justify-start items-center min-w-min",
                                      "text-sm",
                                      isChecked
                                        ? "bg-[#838a98] text-white"
                                        : "bg-[#F4F4F5]",
                                    )}
                                    onClick={() => {
                                      setValues({
                                        tags: isChecked
                                          ? values.tags.filter(
                                              (t) => t !== tag.name,
                                            )
                                          : [...values.tags, tag.name],
                                      });
                                    }}
                                  >
                                    <div
                                      className={classNames(
                                        "p-[2px] rounded-md",
                                        isChecked
                                          ? "bg-transparent border border-transparent"
                                          : "bg-white border border-[#dddddd] rounded-md sha",
                                      )}
                                    >
                                      <FontAwesomeIcon
                                        className={classNames(
                                          "mr-1 opacity-[1] text-lg",
                                          isChecked
                                            ? "text-[#30C054]"
                                            : "text-transparent",
                                        )}
                                        size="lg"
                                        icon={faCheck}
                                      />
                                    </div>
                                    {tag.name}
                                  </div>
                                );
                              })}
                            </div>
                            <Button
                              className="w-full"
                              size="lg"
                              onClick={() =>
                                submitProtectionUpdate(branch, values.tags)
                              }
                            >
                              Confirm
                            </Button>
                          </Form>
                        )}
                      </Formik>
                    </div>
                  </PopoverPanel>
                </Popover>
              </AnimatePresence>
            </div>
          )}
        </div>
        <div className="grow flex flex-row items-center gap-1 basis-2 justify-end">
          {branch.tags?.map((tag, index) => (
            <div
              key={index}
              className={classNames(
                "border border-transparent rounded-3xl p-1.5 px-3 gap-2 flex flex-row justify-start items-center min-w-min",
                "text-sm",
                "bg-[#838a98] text-white",
              )}
            >
              {tag}
            </div>
          ))}
        </div>
        {branchProgress.isFetching &&
          branchProgress.type === "destroy" &&
          branchProgress.name === branch.name && (
            <div className="basis-full">
              <BranchOperateProgress
                operation="Delete"
                progress={branchProgress.details}
              />
            </div>
          )}
      </div>
    </div>
  );
};

function QuoteItem(props: Props) {
  const { quote, isDragging, isGroupedOver, provided, style, isClone, index } =
    props;

  return (
    <Container
      href={quote.author.url}
      isDragging={isDragging}
      isGroupedOver={isGroupedOver}
      isClone={isClone}
      colors={quote.author.colors}
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      style={getStyle(provided, style)}
      data-is-dragging={isDragging}
      data-testid={quote.id}
      data-index={index}
      aria-label={`${quote.author.name} quote ${quote.content}`}
    >
      <Avatar src={quote.author.avatarUrl} alt={quote.author.name} />
      {isClone ? <CloneBadge>Clone</CloneBadge> : null}
      <Content>
        <BlockQuote>{quote.content}</BlockQuote>
        <Footer>
          <Author colors={quote.author.colors}>{quote.author.name}</Author>
          <QuoteId>id:{quote.id}</QuoteId>
        </Footer>
      </Content>
    </Container>
  );
}
