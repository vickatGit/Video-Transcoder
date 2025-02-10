import React from "react";
import { ResolutionData } from "../App";
import Icon from "./Icon";

type Props = {
  videoResolutions: Map<string, ResolutionData>;
};

const Table: React.FC<Props> = (props) => {
  return (
    <div className=" relative w-[90%] max-w-5xl overflow-x-auto mx-auto">
      <div className="absolute w-full h-full bg-black bg-opacity-50 backdrop-blur-4xl flex items-center justify-between rounded-xl"></div>
      <table className="w-full  border-collapse rounded-xl overflow-hidden bg-gradient-to-r from-purple-700 via-blue-900 to-red-700 shadow-lg">
        <thead>
          <tr className="text-white text-[0.9rem] bg-gray-800/60 border-b border-gray-600">
            <th className="p-3">Quality</th>
            <th className="p-3">Status</th>
            <th className="p-3">Progress</th>
            <th className="p-3">Link</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(props.videoResolutions.entries()).map(([key, value]) => {
            return (
              <tr className=" bg-gray-800/50 hover:bg-gray-700/50 border-b border-gray-600">
                <td className="p-3 border-r border-gray-600 text-center  ">
                  <p>{key}</p>
                </td>
                <td className="p-3 border-r border-gray-600">
                  <div className="flex justify-center items-center">
                    <div className=" w-fit custom-bg animate-border border overflow-hidden cursor-pointer">
                      <p className=" bg-[#0B0616] px-6 py-1 rounded-4xl text-[0.65rem]">
                        {value.status}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="p-3 border-r border-gray-600 ">
                  <div className="flex justify-center items-center">
                    <div className="relative w-fit ">
                      <div className="loader w-8 h-8">
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <p className="absolute inset-0 flex items-center justify-center text-[0.6rem] text-white font-semibold">
                        {value.progress}%
                      </p>
                    </div>
                  </div>
                </td>

                <td className="p-3 border-r border-gray-600  ">
                  <div className="flex justify-center items-center cursor-pointer">
                    {value.url?.length > 0 ? (
                      <a
                        href={value.url}
                        target="_blank"
                        className="relative w-fit"
                      >
                        <Icon name="link" className="w-4 h-4 text-[#6E6D72]" />
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
